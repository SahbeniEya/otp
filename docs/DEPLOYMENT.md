# OTP Service - Deployment Guide

## 🚀 Quick Start (Docker Compose)

### 1. Clone and Setup
```bash
git clone <your-repo>
cd otp-service
cp env.example .env
# Edit .env with your configuration
```

### 2. Configure Email (Optional but Recommended)
Edit `.env` file:
```bash
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Use App Password for Gmail
EMAIL_FROM=noreply@your-domain.com
```

### 3. Start Services
```bash
docker-compose up --build
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Health Check**: http://localhost:8000/health/ready

## ☁️ Cloud Deployment (Kubernetes)

### 1. Create Namespace and Secrets
```bash
kubectl apply -f k8s/namespace.yaml
kubectl create secret generic otp-secrets -n otp \
  --from-literal=admin-user=your-admin-username \
  --from-literal=admin-pass=your-secure-password \
  --from-literal=pepper=your-super-secret-pepper
```

### 2. Deploy Infrastructure
```bash
# Deploy Redis
kubectl apply -f k8s/redis.yaml

# Deploy Backend
kubectl apply -f k8s/app.yaml

# Deploy Frontend
kubectl apply -f k8s/frontend.yaml
```

### 3. Access via Ingress
```bash
# Add to /etc/hosts
echo "127.0.0.1 otp.local" >> /etc/hosts

# Access the application
open http://otp.local
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ADMIN_USERNAME` | Admin username | `admin` | ✅ |
| `ADMIN_PASSWORD` | Admin password | `admin` | ✅ |
| `OTP_PEPPER` | Secret pepper for HMAC | `please-change` | ✅ |
| `SMTP_USERNAME` | Email username | - | For email OTP |
| `SMTP_PASSWORD` | Email password | - | For email OTP |
| `REDIS_URL` | Redis connection | `redis://localhost:6379/0` | ✅ |

### Security Checklist

- [ ] Change default admin credentials
- [ ] Set strong OTP_PEPPER (32+ characters)
- [ ] Configure SMTP for email functionality
- [ ] Set up proper domain restrictions
- [ ] Enable HTTPS in production
- [ ] Monitor logs and metrics

## 📊 Monitoring

### Health Checks
- **Liveness**: `/health/live`
- **Readiness**: `/health/ready`
- **Metrics**: `/metrics` (Prometheus format)

### Key Metrics
- `otp_generate_total` - OTPs generated
- `otp_verify_success_total` - Successful verifications
- `otp_email_sent_total` - Emails sent
- `http_requests_total` - API requests

## 🛠️ Development

### Local Development
```bash
# Backend
pip install -r requirements.txt
python -m app.main

# Frontend
cd frontend
npm install
npm run dev
```

### Testing
```bash
# Test OTP generation
curl -X POST http://localhost:8000/api/v1/otp/generate \
  -H 'Content-Type: application/json' \
  -d '{"email": "test@example.com", "type": "numeric"}'

# Test OTP verification
curl -X POST http://localhost:8000/api/v1/otp/verify \
  -H 'Content-Type: application/json' \
  -d '{"otp_id": "otp_123", "otp": "123456"}'
```

## 🚨 Troubleshooting

### Common Issues

1. **Frontend can't connect to backend**
   - Check API_BASE_URL in frontend
   - Ensure backend is running on port 8000

2. **Email not sending**
   - Verify SMTP credentials
   - Check firewall settings
   - Use App Password for Gmail

3. **Redis connection failed**
   - Check Redis is running
   - Verify REDIS_URL configuration

4. **Kubernetes deployment issues**
   - Check pod logs: `kubectl logs -n otp deployment/otp`
   - Verify secrets: `kubectl get secrets -n otp`
   - Check service connectivity

### Logs
```bash
# Docker Compose
docker-compose logs -f

# Kubernetes
kubectl logs -f deployment/otp -n otp
kubectl logs -f deployment/otp-frontend -n otp
```
