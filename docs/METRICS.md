# Metrics Reference

This service exposes Prometheus metrics at `/metrics`.

## Existing Counters / Histograms

- `http_requests_total{handler,method,code}`: Total HTTP requests per endpoint.
- `http_request_duration_seconds{handler,method}`: Request latency histogram (overall per handler).
- `otp_generate_total`: Count of OTPs generated (all types).
- `otp_verify_success_total`: Successful OTP or TOTP verifications.
- `otp_verify_fail_total{reason}`: Failed OTP/TOTP verifications grouped by reason (e.g. invalid, expired, used, not_found, email_mismatch, invalid_request, invalid_token).
- `otp_email_sent_total`: Number of OTP emails sent successfully.
- `otp_email_failed_total`: Number of OTP email send attempts that failed.

## Newly Added Histograms (Fine‑grained)

| Metric | Description | Buckets |
|--------|-------------|---------|
| `otp_generate_duration_seconds` | Time to generate + persist an OTP (excludes email send) | 1ms .. 1s |
| `otp_verify_duration_seconds` | Time to verify & consume an OTP | 1ms .. 0.5s |
| `totp_verify_duration_seconds` | Time to verify a TOTP token (window search) | 1ms .. 0.5s |
| `otp_email_send_duration_seconds` | SMTP send duration for OTP email | 50ms .. 13s |
| `readiness_check_duration_seconds` | Readiness probe execution time (Redis ping) | 1ms .. 100ms |

## Usage Examples

Typical PromQL queries:

```
# P95 latency for OTP generation
histogram_quantile(0.95, sum(rate(otp_generate_duration_seconds_bucket[5m])) by (le))

# Error rate of OTP verification
sum(rate(otp_verify_fail_total[5m])) / (sum(rate(otp_verify_fail_total[5m])) + sum(rate(otp_verify_success_total[5m])))

# Email send success rate
sum(increase(otp_email_sent_total[1h])) / (sum(increase(otp_email_sent_total[1h])) + sum(increase(otp_email_failed_total[1h])))

# Readiness latency P99
histogram_quantile(0.99, sum(rate(readiness_check_duration_seconds_bucket[10m])) by (le))
```

## Dashboard Ideas

- Latency panels (P50/P95/P99) for generate, verify, email send.
- Error rate stacked by reason (label `reason` of `otp_verify_fail_total`).
- Redis vs Memory fallback ratio (derive from readiness `storage` dimension via logging / future gauge).
- Alert: High email failure rate > 5% over 15m.
- Alert: OTP verify failure spike (invalid vs expired) to detect brute force vs clock skew.

## Extension Opportunities

- Add histogram for storage operations (Redis round‑trip) if needed.
- Add counter for rate-limited requests.
- Add gauge for fallback mode status (0|1) exported periodically.

---
Generated automatically as part of metrics enhancement task (Requirement B).
