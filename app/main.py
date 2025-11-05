from dotenv import load_dotenv
load_dotenv()  # Charger les variables d'environnement en premier

from datetime import datetime, timezone
import secrets
import time
import io
from functools import wraps
from typing import Optional
import base64
import binascii
import qrcode

from flask import Flask, jsonify, request, render_template, redirect, session
from flask_cors import CORS, cross_origin
app = Flask(__name__) 
CORS(app, resources={r"/*": {"origins": "*"}})

from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
import redis
import redis.exceptions

from .config import get_settings
from .otp import generate_code, hash_code_with_salt, new_otp_id, compute_hmac
from .storage import RedisStorage
from .email_service import email_service
from .totp_service import totp_service

s = get_settings()

# Metrics
"""Prometheus metrics declarations.

Existing counters/histograms:
  http_requests_total{handler,method,code}      - per-endpoint request counts
  http_request_duration_seconds{handler,method} - per-endpoint total latency
  otp_generate_total                            - count of OTPs generated
  otp_verify_success_total                      - successful OTP/TOTP verifications
  otp_verify_fail_total{reason}                 - failed OTP/TOTP verifications by reason
  otp_email_sent_total                          - emails successfully sent
  otp_email_failed_total                        - failed email send attempts

Added granular histograms (requirement B: histogram/metrics):
  otp_generate_duration_seconds                 - time to generate & persist an OTP (excludes email send)
  otp_verify_duration_seconds                   - time to verify & consume an OTP
  totp_verify_duration_seconds                  - time to verify a TOTP token
  otp_email_send_duration_seconds               - time spent sending OTP email (SMTP interaction)
  readiness_check_duration_seconds              - time spent performing readiness probe (Redis ping, logic)
"""
REQ_COUNTER = Counter('http_requests_total', 'HTTP requests total', ['handler', 'method', 'code'])
LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency', ['handler', 'method'])
GEN_COUNT = Counter('otp_generate_total', 'Number of OTP generated')
VERIFY_OK = Counter('otp_verify_success_total', 'Number of successful OTP verifications')
VERIFY_FAIL = Counter('otp_verify_fail_total', 'Number of failed OTP verifications', ['reason'])
EMAIL_SENT = Counter('otp_email_sent_total', 'Number of OTP emails sent')
EMAIL_FAILED = Counter('otp_email_failed_total', 'Number of failed OTP email sends')

# New histograms (bucket choices tuned to expected latency distributions)
OTP_GENERATE_DURATION = Histogram(
    'otp_generate_duration_seconds',
    'Time to generate and persist a single OTP (sans email send)',
    buckets=(0.001, 0.003, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0)
)
OTP_VERIFY_DURATION = Histogram(
    'otp_verify_duration_seconds',
    'Time to verify and consume an OTP',
    buckets=(0.001, 0.003, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5)
)
TOTP_VERIFY_DURATION = Histogram(
    'totp_verify_duration_seconds',
    'Time to verify a TOTP token over the configured window',
    buckets=(0.001, 0.003, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5)
)
EMAIL_SEND_DURATION = Histogram(
    'otp_email_send_duration_seconds',
    'Time spent sending OTP email via SMTP',
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2, 3, 5, 8, 13)
)
READINESS_DURATION = Histogram(
    'readiness_check_duration_seconds',
    'Time to perform readiness probe (including Redis ping)',
    buckets=(0.001, 0.003, 0.005, 0.01, 0.02, 0.05, 0.1)
)


def create_app() -> Flask:
    app = Flask(__name__, template_folder="templates", static_folder="static")
    app.config['SECRET_KEY'] = secrets.token_hex(16)
    
    # Configure CORS for all routes
    CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"], supports_credentials=True)

    # Failsafe: explicitly add CORS headers (covers any route Flask-CORS might skip)
    @app.after_request
    def add_cors_headers(resp):
        origin = request.headers.get('Origin')
        if origin in {"http://localhost:3000", "http://127.0.0.1:3000"}:
            resp.headers['Access-Control-Allow-Origin'] = origin
            resp.headers['Vary'] = 'Origin'
            resp.headers['Access-Control-Allow-Credentials'] = 'true'
            resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        return resp

    storage = RedisStorage()

    def rate_limit(limit: int = s.rate_limit_per_minute, burst: int = s.rate_limit_burst):
        def decorator(fn):
            @wraps(fn)
            def wrapper(*args, **kwargs):
                if storage._use_fallback:
                    # Skip rate limiting when Redis is not available
                    return fn(*args, **kwargs)

                try:
                    ip = request.headers.get('X-Forwarded-For', request.remote_addr) or 'unknown'
                    
                    # Enhanced rate limiting with sliding window
                    key = f"{s.redis_namespace}:rl:{ip}:{request.endpoint}"
                    now = int(time.time())
                    
                    if not storage._r.ping():
                        storage._use_fallback = True
                        return fn(*args, **kwargs)

                    # Sliding window rate limiting
                    pipe = storage._r.pipeline()
                    pipe.zremrangebyscore(key, 0, now - 60)  # Remove old entries
                    pipe.zcard(key)  # Count current entries
                    pipe.zadd(key, {str(now): now})  # Add current request
                    pipe.expire(key, 60)  # Set expiry
                    
                    results = pipe.execute()
                    current_count = results[1]
                    
                    if current_count > limit:
                        return jsonify({
                            "error": "rate_limited", 
                            "message": f"Too many requests. Limit: {limit} per minute",
                            "retry_after": 60
                        }), 429
                    
                    return fn(*args, **kwargs)
                except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError):
                    storage._use_fallback = True
                    return fn(*args, **kwargs)
            return wrapper
        return decorator

    def is_admin_request() -> bool:
        auth = request.headers.get('Authorization', '')
        if not auth:
            return False
        parts = auth.split()
        if len(parts) != 2:
            return False
        scheme = parts[0].lower()
        token = parts[1]
        if scheme == 'bearer':
            if s.admin_token and secrets.compare_digest(token, s.admin_token):
                return True
        if scheme == 'basic':
            try:
                decoded = base64.b64decode(token).decode('utf-8')
                if ':' in decoded:
                    user, pwd = decoded.split(':', 1)
                    if secrets.compare_digest(user, s.admin_username) and secrets.compare_digest(pwd, s.admin_password):
                        return True
            except (binascii.Error, UnicodeDecodeError):
                return False
        return False

    def json_response(handler_name, data, status=200):
        REQ_COUNTER.labels(handler=handler_name, method=request.method, code=str(status)).inc()
        return jsonify(data), status

    def validate_length_ttl(length: int, ttl: int) -> Optional[str]:
        if not (4 <= length <= 20):
            return "Invalid length"
        if not (30 <= ttl <= 86400):
            return "Invalid ttl"
        return None

    @app.route('/health/live')
    @app.route('/healthz')
    @cross_origin(origins=["http://localhost:3000", "http://127.0.0.1:3000"], supports_credentials=True)
    def live():
        return json_response('live', {"status": "ok"})

    @app.route('/health/ready', methods=['GET', 'OPTIONS'])
    @app.route('/readyz')
    @cross_origin(origins=["http://localhost:3000", "http://127.0.0.1:3000"], supports_credentials=True)
    def ready():
        _ready_start = time.time()
        # Short-circuit OPTIONS (preflight) manually to ensure headers are attached
        if request.method == 'OPTIONS':
            READINESS_DURATION.observe(time.time() - _ready_start)
            return ('', 204)
        # If Redis fallback is active, we still consider the service operational but degraded
        if getattr(storage, '_use_fallback', False):
            READINESS_DURATION.observe(time.time() - _ready_start)
            return json_response('ready', {"ready": True, "degraded": True, "storage": "memory"})
        try:
            storage._r.ping()
            READINESS_DURATION.observe(time.time() - _ready_start)
            return json_response('ready', {"ready": True, "degraded": False, "storage": "redis"})
        except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError):
            # Switch to degraded mode implicitly and report as ready but degraded
            storage._use_fallback = True
            READINESS_DURATION.observe(time.time() - _ready_start)
            return json_response('ready', {"ready": True, "degraded": True, "storage": "memory"})

    @app.route('/metrics')
    def metrics():
        return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}

    @app.route('/api/v1/metrics', methods=['GET'])
    @cross_origin(origins=["http://localhost:3000", "http://127.0.0.1:3000"], supports_credentials=True)
    def api_metrics():
        """Comprehensive metrics API for the monitoring dashboard"""
        import psutil
        import os
        from datetime import datetime, timezone
        
        # Get Prometheus metrics
        metrics_text = generate_latest().decode('utf-8')
        
        # Parse metrics
        metrics_data = {}
        for line in metrics_text.split('\n'):
            if line and not line.startswith('#'):
                parts = line.split(' ')
                if len(parts) >= 2:
                    metric_name = parts[0]
                    try:
                        value = float(parts[1])
                        metrics_data[metric_name] = value
                    except ValueError:
                        continue
        
        # Calculate derived metrics
        total_otps = metrics_data.get('otp_generate_total', 0)
        successful_verifications = metrics_data.get('otp_verify_success_total', 0)
        failed_verifications = metrics_data.get('otp_verify_fail_total', 0)
        emails_sent = metrics_data.get('otp_email_sent_total', 0)
        emails_failed = metrics_data.get('otp_email_failed_total', 0)
        
        # Calculate success rate
        total_verifications = successful_verifications + failed_verifications
        success_rate = (successful_verifications / total_verifications * 100) if total_verifications > 0 else 0
        
        # System metrics
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            # Calculate uptime
            boot_time = psutil.boot_time()
            current_time = time.time()
            uptime_seconds = current_time - boot_time
            
            # Format uptime
            days = int(uptime_seconds // 86400)
            hours = int((uptime_seconds % 86400) // 3600)
            minutes = int((uptime_seconds % 3600) // 60)
            
            if days > 0:
                uptime_str = f"{days}d {hours}h {minutes}m"
            elif hours > 0:
                uptime_str = f"{hours}h {minutes}m"
            else:
                uptime_str = f"{minutes}m"
                
        except Exception:
            cpu_percent = 0
            memory_percent = 0
            uptime_str = "Unknown"
        
        # Active connections (approximate)
        try:
            connections = len(psutil.net_connections())
        except Exception:
            connections = 0
        
        # Response time (average from histogram)
        response_time = 0
        if 'http_request_duration_seconds_sum' in metrics_data and 'http_request_duration_seconds_count' in metrics_data:
            total_time = metrics_data['http_request_duration_seconds_sum']
            total_requests = metrics_data['http_request_duration_seconds_count']
            if total_requests > 0:
                response_time = (total_time / total_requests) * 1000  # Convert to milliseconds
        
        return json_response('metrics', {
            'totalOTPs': int(total_otps),
            'successRate': round(success_rate, 1),
            'emailsSent': int(emails_sent),
            'emailsFailed': int(emails_failed),
            'uptime': uptime_str,
            'cpuUsage': round(cpu_percent, 1),
            'memoryUsage': round(memory_percent, 1),
            'activeConnections': connections,
            'responseTime': round(response_time, 2),
            'storage': 'redis' if not getattr(storage, '_use_fallback', False) else 'memory',
            'timestamp': datetime.now(timezone.utc).isoformat()
        })

    @app.route('/api/v1/otp', methods=['POST'])
    @rate_limit()
    def create_otp():
        start = time.time()
        op_start = time.time()
        payload = request.get_json(force=True, silent=True) or {}
        length = int(payload.get('length', s.otp_default_length))
        ttl = int(payload.get('ttl', s.otp_default_ttl_seconds))
        subject = payload.get('subject')
        purpose = payload.get('purpose')
        charset = payload.get('charset', 'digits')

        # New email parameters
        email = payload.get('email')
        organization = payload.get('organization')
        email_subject = payload.get('email_subject')
        send_email = payload.get('send_email', False)

        err = validate_length_ttl(length, ttl)
        if err:
            VERIFY_FAIL.labels(reason='invalid_request').inc()
            return json_response('create_otp', {"error": err}, 400)

        code = generate_code(length, charset)
        hmac_value, salt = hash_code_with_salt(code)
        otp_id = new_otp_id()
        storage.create(otp_id, hmac_value, salt, ttl, subject, purpose)
        OTP_GENERATE_DURATION.observe(time.time() - op_start)
        GEN_COUNT.inc()
        expires_at = datetime.now(timezone.utc).timestamp() + ttl

        body = {
            "id": otp_id,
            "ttl": ttl,
            "expires_at": datetime.fromtimestamp(expires_at, tz=timezone.utc).isoformat()
        }

        # Send email if requested and email provided
        if send_email and email:
            email_start = time.time()
            success, message = email_service.send_otp_email(
                to_email=email,
                otp_code=code,
                organization=organization,
                subject=email_subject,
                purpose=purpose or ""
            )
            EMAIL_SEND_DURATION.observe(time.time() - email_start)

            if success:
                EMAIL_SENT.inc()
                body["email_sent"] = True
                body["email_message"] = message
            else:
                EMAIL_FAILED.inc()
                body["email_sent"] = False
                body["email_error"] = message

        # Include code in response for debug/admin requests
        if s.debug or is_admin_request() or request.args.get('debug') == 'true':
            body["code"] = code

        LATENCY.labels('create_otp', request.method).observe(time.time() - start)
        return json_response('create_otp', body, 201)

    @app.route('/api/v1/otp/generate', methods=['POST'])
    @rate_limit()
    def generate_otp_with_email():
        """New endpoint similar to the reference project - generates and sends OTP via email"""
        start = time.time()
        op_start = time.time()
        payload = request.get_json(force=True, silent=True) or {}

        email = payload.get('email')
        if not email:
            VERIFY_FAIL.labels(reason='missing_email').inc()
            return json_response('generate_otp_email', {"error": "Email is required"}, 400)

        otp_type = payload.get('type', 'numeric')  # numeric, alphanumeric, alphabet
        organization = payload.get('organization')
        email_subject = payload.get('subject')
        length = int(payload.get('length', s.otp_default_length))
        ttl = int(payload.get('ttl', s.otp_default_ttl_seconds))

        # Map OTP type to charset
        charset_map = {
            'numeric': 'digits',
            'alphanumeric': 'alnum',
            'alphabet': 'alpha'
        }
        charset = charset_map.get(otp_type, 'digits')

        err = validate_length_ttl(length, ttl)
        if err:
            VERIFY_FAIL.labels(reason='invalid_request').inc()
            return json_response('generate_otp_email', {"error": err}, 400)

        # Generate OTP
        code = generate_code(length, charset)
        hmac_value, salt = hash_code_with_salt(code)
        otp_id = new_otp_id()
        storage.create(otp_id, hmac_value, salt, ttl, email, f"email_otp_{otp_type}")
        OTP_GENERATE_DURATION.observe(time.time() - op_start)
        GEN_COUNT.inc()

        # Send email
        email_start = time.time()
        success, message = email_service.send_otp_email(
            to_email=email,
            otp_code=code,
            organization=organization,
            subject=email_subject,
            purpose=f"OTP verification - {otp_type}"
        )
        EMAIL_SEND_DURATION.observe(time.time() - email_start)

        if success:
            EMAIL_SENT.inc()
            body = {
                "success": True,
                "message": f"OTP sent to {email}",
                "otp_id": otp_id,
                "type": otp_type,
                "expires_in": ttl
            }
            status_code = 200
        else:
            EMAIL_FAILED.inc()
            body = {
                "success": False,
                "error": message,
                "otp_id": otp_id,
                "type": otp_type,
                "expires_in": ttl
            }
            status_code = 400

        # Include code in response for debug/admin requests
        if s.debug or is_admin_request() or request.args.get('debug') == 'true':
            body["code"] = code

        LATENCY.labels('generate_otp_email', request.method).observe(time.time() - start)
        return json_response('generate_otp_email', body, status_code)

    @app.route('/api/v1/totp/setup', methods=['POST'])
    @rate_limit()
    def setup_totp():
        """Configure TOTP for a user/account"""
        start = time.time()
        payload = request.get_json(force=True, silent=True) or {}
        
        account_name = payload.get('account_name')
        issuer = payload.get('issuer', s.totp_issuer)
        
        if not account_name:
            return json_response('setup_totp', {"error": "account_name is required"}, 400)
        
        # Generate TOTP secret and URI
        secret = totp_service.generate_secret()
        totp_uri = totp_service.get_totp_uri(secret, account_name, issuer)
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        # Convert QR code to base64 image
        img_buffer = io.BytesIO()
        qr.make_image(fill_color="black", back_color="white").save(img_buffer, format='PNG')
        qr_base64 = base64.b64encode(img_buffer.getvalue()).decode()
        
        response = {
            "secret": secret,
            "uri": totp_uri,
            "qr_code": f"data:image/png;base64,{qr_base64}",
            "account_name": account_name,
            "issuer": issuer
        }
        
        LATENCY.labels('setup_totp', request.method).observe(time.time() - start)
        return json_response('setup_totp', response)

    @app.route('/api/v1/totp/verify', methods=['POST'])
    @rate_limit()
    def verify_totp():
        """Verify a TOTP code"""
        start = time.time()
        verify_start = time.time()
        payload = request.get_json(force=True, silent=True) or {}
        
        secret = payload.get('secret')
        token = payload.get('token')
        window = int(payload.get('window', s.totp_default_window))
        
        if not secret or not token:
            VERIFY_FAIL.labels(reason='invalid_request').inc()
            return json_response('verify_totp', {
                "valid": False,
                "success": False,
                "reason": "missing_parameters",
                "message": "Both secret and token are required"
            }, 400)
        
        valid, reason = totp_service.verify_totp(secret, token, window)
        
        if valid:
            VERIFY_OK.inc()
            response = {
                "valid": True,
                "success": True,
                "reason": "ok",
                "message": "TOTP verified successfully"
            }
        else:
            VERIFY_FAIL.labels(reason=reason).inc()
            response = {
                "valid": False,
                "success": False,
                "reason": reason,
                "message": f"TOTP verification failed: {reason}"
            }
        
        TOTP_VERIFY_DURATION.observe(time.time() - verify_start)
        LATENCY.labels('verify_totp', request.method).observe(time.time() - start)
        return json_response('verify_totp', response)

    @app.route('/api/v1/otp/verify', methods=['POST'])
    @rate_limit()
    def verify_otp():
        start = time.time()
        verify_start = time.time()
        payload = request.get_json(force=True, silent=True) or {}
        otp_id = payload.get('id') or payload.get('otp_id')  # Support both formats
        code = payload.get('code') or payload.get('otp')  # Support both formats
        email = payload.get('email')  # Optional for additional validation

        if not otp_id or not code:
            VERIFY_FAIL.labels(reason='invalid_request').inc()
            return json_response('verify_otp', {"valid": False, "reason": "invalid"}, 400)

        meta = storage.get_meta(otp_id)
        if not meta:
            VERIFY_FAIL.labels(reason='not_found').inc()
            return json_response('verify_otp', {"valid": False, "reason": "invalid"}, 200)

        # Optional email validation
        if email and meta.get('subject') and meta.get('subject') != email:
            VERIFY_FAIL.labels(reason='email_mismatch').inc()
            return json_response('verify_otp', {"valid": False, "reason": "invalid"}, 200)

        hmac_candidate = compute_hmac(s.otp_pepper.encode('utf-8'), code, meta.get('salt', ''))
        ok, reason = storage.verify_and_consume(otp_id, hmac_candidate)
        if ok:
            VERIFY_OK.inc()
            resp = {"valid": True, "success": True, "reason": "ok", "message": "OTP verified successfully"}
        else:
            VERIFY_FAIL.labels(reason=reason).inc()
            resp = {"valid": False, "success": False, "reason": reason, "message": f"OTP verification failed: {reason}"}
        OTP_VERIFY_DURATION.observe(time.time() - verify_start)
        LATENCY.labels('verify_otp', request.method).observe(time.time() - start)
        return json_response('verify_otp', resp)

    # Admin GUI (Bearer token required)
    def admin_required(fn):
        @wraps(fn)
        def wrap(*args, **kwargs):
            if not is_admin_request():
                # Send proper WWW-Authenticate header to trigger browser login dialog
                response = jsonify({"error": "unauthorized"})
                response.status_code = 401
                response.headers['WWW-Authenticate'] = 'Basic realm="OTP Admin"'
                return response
            return fn(*args, **kwargs)
        return wrap

    @app.route('/')
    def index():
        # Redirect to the Next.js frontend
        return jsonify({
            "message": "Welcome to OTP Service API",
            "version": "1.0.0",
            "frontend_url": "http://localhost:3000"
        })

    @app.route('/admin/generate', methods=['POST'])
    @admin_required
    def admin_generate():
        length = int(request.form.get('length', s.otp_default_length))
        ttl = int(request.form.get('ttl', s.otp_default_ttl_seconds))
        subject = request.form.get('subject') or None
        purpose = request.form.get('purpose') or None
        email = request.form.get('email')
        send_email = request.form.get('send_email') == 'on'
        otp_type = request.form.get('otp_type', 'numeric')
        
        # If send_email is checked but no email provided, try to use subject as email
        if send_email and not email and subject and '@' in subject:
            email = subject

        # Map OTP type to charset
        charset_map = {
            'numeric': 'digits',
            'alphanumeric': 'alnum',
            'alphabet': 'alpha'
        }
        charset = charset_map.get(otp_type, 'digits')

        code = generate_code(length, charset)
        hmac_value, salt = hash_code_with_salt(code)
        otp_id = new_otp_id()
        storage.create(otp_id, hmac_value, salt, ttl, subject, purpose)
        session['last_code'] = code

        # Send email if requested
        if send_email and email:
            success, message = email_service.send_otp_email(
                to_email=email,
                otp_code=code,
                organization=s.organization_name,
                subject=None,
                purpose=f"{purpose or 'OTP'} - {otp_type}"
            )
            if success:
                session['email_sent'] = f"Email sent to {email} (Type: {otp_type})"
                EMAIL_SENT.inc()
            else:
                session['email_error'] = f"Failed to send email: {message}"
                EMAIL_FAILED.inc()

        return redirect('/')

    @app.route('/admin/otps', methods=['GET'])
    @admin_required
    def admin_list_api():
        # pagination and filters
        limit = int(request.args.get('limit', 50))
        subject = request.args.get('subject')
        purpose = request.args.get('purpose')
        status = request.args.get('status')
        items = storage.list_active(limit=limit, subject=subject, purpose=purpose, status=status)
        return json_response('admin_otps', {"items": items, "count": len(items)})

    @app.route('/admin/purge', methods=['POST'])
    @admin_required
    def admin_purge():
        storage.purge_index()
        return redirect('/')

    return app


# WSGI entrypoint
app = create_app()

if __name__ == '__main__':
    # Local development server
    app.run(host=s.host, port=s.port, debug=s.debug)
