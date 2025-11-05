import os
from functools import lru_cache
from pydantic import BaseModel, Field


class Settings(BaseModel):
    app_name: str = Field(default=os.getenv("APP_NAME", "otp-service"))
    environment: str = Field(default=os.getenv("ENVIRONMENT", "dev"))
    debug: bool = Field(default=os.getenv("DEBUG", "false").lower() in ["1", "true", "yes"])
    host: str = Field(default=os.getenv("HOST", "0.0.0.0"))
    port: int = Field(default=int(os.getenv("PORT", "8000")))

    # Security
    admin_username: str = Field(default=os.getenv("ADMIN_USERNAME", "admin"))
    admin_password: str = Field(default=os.getenv("ADMIN_PASSWORD", "admin"))
    admin_token: str = Field(default=os.getenv("ADMIN_TOKEN", ""))
    otp_default_length: int = Field(default=int(os.getenv("OTP_DEFAULT_LENGTH", "6")))
    otp_default_ttl_seconds: int = Field(default=int(os.getenv("OTP_DEFAULT_TTL_SECONDS", "300")))
    otp_charset: str = Field(default=os.getenv("OTP_CHARSET", "0123456789"))
    otp_hash_alg: str = Field(default=os.getenv("OTP_HASH_ALG", "sha256"))
    otp_pepper: str = Field(default=os.getenv("OTP_PEPPER", "default-pepper-change-me"))

    # Email Configuration
    smtp_host: str = Field(default=os.getenv("SMTP_HOST", "smtp.gmail.com"))
    smtp_port: int = Field(default=int(os.getenv("SMTP_PORT", "587")))
    smtp_username: str = Field(default=os.getenv("SMTP_USERNAME", ""))
    smtp_password: str = Field(default=os.getenv("SMTP_PASSWORD", ""))
    smtp_use_tls: bool = Field(default=os.getenv("SMTP_USE_TLS", "true").lower() in ["1", "true", "yes"])
    email_from: str = Field(default=os.getenv("EMAIL_FROM", "noreply@otp-service.com"))
    email_from_name: str = Field(default=os.getenv("EMAIL_FROM_NAME", "OTP Service"))

    # OTP Email Settings
    organization_name: str = Field(default=os.getenv("ORGANIZATION_NAME", "OTP Service"))
    email_subject_template: str = Field(default=os.getenv("EMAIL_SUBJECT_TEMPLATE", "Your OTP Code - {organization}"))

    # Spam Protection
    spam_keywords: list = Field(
        default_factory=lambda: os.getenv("SPAM_KEYWORDS", "").split(",") if os.getenv("SPAM_KEYWORDS") else [])
    allowed_domains: list = Field(
        default_factory=lambda: os.getenv("ALLOWED_DOMAINS", "").split(",") if os.getenv("ALLOWED_DOMAINS") else [])

    # Redis
    redis_url: str = Field(default=os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    redis_namespace: str = Field(default=os.getenv("REDIS_NAMESPACE", "otp"))

    # TOTP Settings
    totp_issuer: str = Field(default=os.getenv("TOTP_ISSUER", "OTP Service"))
    totp_default_window: int = Field(default=int(os.getenv("TOTP_DEFAULT_WINDOW", "1")))

    # Rate limits (simple, optional)
    rate_limit_per_minute: int = Field(default=int(os.getenv("RATE_LIMIT_PER_MINUTE", "60")))
    rate_limit_burst: int = Field(default=int(os.getenv("RATE_LIMIT_BURST", "120")))


# Removed cache to ensure settings are always fresh
def get_settings() -> Settings:
    return Settings()
