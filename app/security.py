"""
Enhanced security features for the OTP service
"""
import time
import hashlib
import secrets
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import ipaddress

class SecurityManager:
    def __init__(self):
        self.failed_attempts: Dict[str, List[float]] = {}
        self.blocked_ips: Dict[str, float] = {}
        self.suspicious_patterns = [
            'admin', 'test', '123456', 'password', 'login'
        ]
    
    def is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is temporarily blocked"""
        if ip in self.blocked_ips:
            if time.time() - self.blocked_ips[ip] < 3600:  # 1 hour block
                return True
            else:
                del self.blocked_ips[ip]
        return False
    
    def record_failed_attempt(self, ip: str) -> None:
        """Record failed attempt and block if too many"""
        now = time.time()
        if ip not in self.failed_attempts:
            self.failed_attempts[ip] = []
        
        # Clean old attempts (older than 1 hour)
        self.failed_attempts[ip] = [
            attempt for attempt in self.failed_attempts[ip] 
            if now - attempt < 3600
        ]
        
        self.failed_attempts[ip].append(now)
        
        # Block if more than 5 attempts in 1 hour
        if len(self.failed_attempts[ip]) > 5:
            self.blocked_ips[ip] = now
            print(f"🚨 IP {ip} blocked due to too many failed attempts")
    
    def is_suspicious_email(self, email: str) -> bool:
        """Check for suspicious email patterns"""
        email_lower = email.lower()
        return any(pattern in email_lower for pattern in self.suspicious_patterns)
    
    def generate_secure_token(self, length: int = 32) -> str:
        """Generate cryptographically secure token"""
        return secrets.token_urlsafe(length)
    
    def validate_ip_range(self, ip: str) -> bool:
        """Validate IP address format"""
        try:
            ipaddress.ip_address(ip)
            return True
        except ValueError:
            return False

# Global security manager
security_manager = SecurityManager()
