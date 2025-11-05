# Health and Metrics Endpoints

Application exposes the following endpoints:

- Liveness: GET /health/live
  Returns 200 {"status":"ok"} when the process is alive.

- Readiness: GET /health/ready
  Returns 200 {"ready": true} if Redis is reachable (PING succeeds), 503 otherwise.

- Metrics: GET /metrics
  Prometheus exposition format (Content-Type: text/plain; version=0.0.4). Includes:
  - http_requests_total{handler,method,code}
  - http_request_duration_seconds{handler,method}
  - otp_generate_total
  - otp_verify_success_total
  - otp_verify_fail_total{reason}

Kubernetes probes (Deployment):
- readinessProbe: path /health/ready
- livenessProbe: path /health/live

Note: legacy aliases /healthz and /readyz are still routed but may be removed in the future; prefer the canonical paths above.
