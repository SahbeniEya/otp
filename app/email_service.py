import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import re
from datetime import datetime

from .config import get_settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.settings = get_settings()

    def _validate_email(self, email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

    def _check_allowed_domain(self, email: str) -> bool:
        """Check if email domain is allowed"""
        if not self.settings.allowed_domains:
            return True  # No restrictions

        domain = email.split('@')[1].lower()
        return domain in [d.lower().strip() for d in self.settings.allowed_domains]

    def _check_spam_keywords(self, subject: str, purpose: str = "") -> bool:
        """Check for spam keywords"""
        if not self.settings.spam_keywords:
            return False  # No spam keywords configured

        text_to_check = f"{subject} {purpose}".lower()
        spam_words = [word.lower().strip() for word in self.settings.spam_keywords if word.strip()]

        return any(spam_word in text_to_check for spam_word in spam_words)

    def _create_otp_email(self, to_email: str, otp_code: str, organization: str = None,
                          subject: str = None) -> MIMEMultipart:
        """Create OTP email message"""
        org_name = organization or self.settings.organization_name
        email_subject = subject or self.settings.email_subject_template.format(organization=org_name)

        msg = MIMEMultipart('alternative')
        msg['From'] = f"{self.settings.email_from_name} <{self.settings.email_from}>"
        msg['To'] = to_email
        msg['Subject'] = email_subject

        # Enhanced HTML email template with better security features
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>OTP Verification - {org_name}</title>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; position: relative; }}
                .header::before {{ content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>'); opacity: 0.1; }}
                .content {{ padding: 50px 30px; text-align: center; }}
                .otp-code {{ font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #f8f9ff 0%, #e8f0ff 100%); border-radius: 12px; border: 3px dashed #667eea; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2); }}
                .footer {{ background: #f8f9fa; padding: 30px; text-align: center; color: #6c757d; font-size: 14px; border-top: 1px solid #e9ecef; }}
                .warning {{ color: #dc3545; font-size: 14px; margin-top: 25px; padding: 15px; background: #fff5f5; border-radius: 8px; border-left: 4px solid #dc3545; }}
                .security-badge {{ display: inline-block; background: #28a745; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; margin: 10px 0; }}
                .timestamp {{ color: #6c757d; font-size: 12px; margin-top: 15px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 {org_name}</h1>
                    <p>Your secure verification code</p>
                    <div class="security-badge">🔒 End-to-End Encrypted</div>
                </div>
                <div class="content">
                    <h2>Your OTP Code</h2>
                    <p>Use this code to complete your verification:</p>
                    <div class="otp-code">{otp_code}</div>
                    <p>This code will expire in <strong>5 minutes</strong></p>
                    <div class="warning">
                        ⚠️ <strong>Security Notice:</strong> Never share this code with anyone. {org_name} will never ask for your OTP code via phone or email.
                    </div>
                    <div class="timestamp">
                        Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}
                    </div>
                </div>
                <div class="footer">
                    <p>If you didn't request this code, please ignore this email and consider changing your password.</p>
                    <p>© 2025 {org_name}. All rights reserved. | <a href="#" style="color: #667eea;">Privacy Policy</a></p>
                </div>
            </div>
        </body>
        </html>
        """

        # Text version for email clients that don't support HTML
        text_body = f"""
        {org_name} - OTP Verification
        
        Your verification code: {otp_code}
        
        This code will expire in 5 minutes.
        
        Never share this code with anyone. {org_name} will never ask for your OTP code.
        
        If you didn't request this code, please ignore this email.
        """

        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))

        return msg

    def send_otp_email(self, to_email: str, otp_code: str, organization: str = None,
                       subject: str = None, purpose: str = "") -> tuple[bool, str]:
        """
        Send OTP via email
        Returns: (success: bool, message: str)
        """
        try:
            # Validation checks
            if not self._validate_email(to_email):
                return False, "Invalid email format"

            if not self._check_allowed_domain(to_email):
                return False, "Email domain not allowed"

            if self._check_spam_keywords(subject or "", purpose):
                return False, "Request blocked due to spam detection"

            # Check if SMTP is configured
            if not self.settings.smtp_username or not self.settings.smtp_password:
                logger.warning("❌ SMTP not configured! Please set SMTP_USERNAME and SMTP_PASSWORD")
                print(f"❌ SMTP Configuration Missing:")
                print(f"   Current SMTP_USERNAME: '{self.settings.smtp_username}'")
                print(
                    f"   Current SMTP_PASSWORD: '{'*' * len(self.settings.smtp_password) if self.settings.smtp_password else 'NOT SET'}'")
                print(f"   SMTP_HOST: {self.settings.smtp_host}")
                print(f"   SMTP_PORT: {self.settings.smtp_port}")
                print(f"📧 Email would be sent to: {to_email}")
                print(f"🔐 OTP Code would be: {otp_code}")
                return False, f"SMTP not configured. Code would be: {otp_code}"

            # Debug SMTP settings
            print(f"📧 Attempting to send email...")
            print(f"   SMTP Host: {self.settings.smtp_host}:{self.settings.smtp_port}")
            print(f"   From: {self.settings.email_from}")
            print(f"   To: {to_email}")
            print(f"   OTP: {otp_code}")

            # Create and send email
            msg = self._create_otp_email(to_email, otp_code, organization, subject)

            print(f"📧 Detailed email configuration:")
            print(f"   SMTP Host: {self.settings.smtp_host}")
            print(f"   SMTP Port: {self.settings.smtp_port}")
            print(f"   SMTP Username: {self.settings.smtp_username}")
            print(f"   SMTP Password: {'*' * len(self.settings.smtp_password)}")
            print(f"   From: {msg['From']}")
            print(f"   To: {msg['To']}")
            print(f"   Subject: {msg['Subject']}")
            
            with smtplib.SMTP(self.settings.smtp_host, self.settings.smtp_port, timeout=10) as server:
                server.set_debuglevel(1)  # Enable SMTP debugging
                if self.settings.smtp_use_tls:
                    print(f"🔒 Starting TLS...")
                    server.starttls()

                print(f"🔑 Authenticating with {self.settings.smtp_username}...")
                server.login(self.settings.smtp_username, self.settings.smtp_password)

                print(f"📤 Sending email...")
                server.send_message(msg)
                server.quit()

            logger.info(f"✅ OTP email sent successfully to {to_email}")
            print(f"✅ Email sent successfully to {to_email}!")
            return True, f"Email sent to {to_email}"

        except smtplib.SMTPAuthenticationError as e:
            error_msg = f"SMTP authentication failed: {e}"
            logger.error(error_msg)
            print(f"❌ {error_msg}")
            print("💡 For Gmail, make sure you're using an App Password, not your regular password!")
            return False, "Email authentication failed - check credentials"
        except smtplib.SMTPException as e:
            error_msg = f"SMTP error: {e}"
            logger.error(error_msg)
            print(f"❌ {error_msg}")
            return False, f"Failed to send email: {e}"
        except Exception as e:
            error_msg = f"Unexpected error sending email: {e}"
            logger.error(error_msg)
            print(f"❌ {error_msg}")
            return False, f"Failed to send email: {e}"


# Global email service instance - sera initialisé avec les variables d'environnement
email_service = None

def get_email_service():
    global email_service
    if email_service is None:
        email_service = EmailService()
    return email_service

email_service = get_email_service()
