import base64
import hmac
import struct
import time
from typing import Tuple, Optional

from .config import get_settings


class TOTPService:
    def __init__(self):
        self.settings = get_settings()
        self.time_step = 30  # TOTP standard time step (30 seconds)
        self.digits = 6      # TOTP standard digits

    def generate_secret(self, length: int = 32) -> str:
        """Generate a random secret key for TOTP."""
        import secrets
        return base64.b32encode(secrets.token_bytes(length)).decode('utf-8')

    def get_totp_token(self, secret: str, current_time: Optional[int] = None) -> str:
        """Generate a TOTP token for the given secret and time."""
        if current_time is None:
            current_time = int(time.time())
        
        # Calculate counter value (number of time steps since epoch)
        time_counter = struct.pack('>Q', current_time // self.time_step)
        
        # Decode base32 secret
        key = base64.b32decode(secret.upper())
        
        # Calculate HMAC-SHA1
        hmac_obj = hmac.new(key, time_counter, 'sha1')
        hmac_result = hmac_obj.digest()
        
        # Get offset
        offset = hmac_result[-1] & 0xf
        
        # Generate 4-byte code
        code_bytes = hmac_result[offset:offset + 4]
        code = struct.unpack('>L', code_bytes)[0]
        
        # Apply modulus to get the desired number of digits
        code = code & 0x7fffffff
        code = code % (10 ** self.digits)
        
        # Return code with leading zeros if necessary
        return str(code).zfill(self.digits)

    def verify_totp(self, secret: str, token: str, window: int = 1) -> Tuple[bool, str]:
        """
        Verify a TOTP token with a window of time steps before and after current time.
        Args:
            secret: The base32 encoded secret key
            token: The token to verify
            window: Number of time steps to check before and after current time
        Returns:
            Tuple of (is_valid, reason)
        """
        try:
            token = str(token).zfill(self.digits)
            current_time = int(time.time())

            # Check tokens in time window
            for offset in range(-window, window + 1):
                check_time = current_time + (offset * self.time_step)
                if self.get_totp_token(secret, check_time) == token:
                    return True, "ok"

            return False, "invalid_token"

        except (ValueError, TypeError):
            return False, "invalid_format"
        except Exception as e:
            return False, f"verification_error: {str(e)}"

    def get_totp_uri(self, secret: str, account_name: str, issuer: str = None) -> str:
        """
        Generate a TOTP URI for QR code generation.
        Format: otpauth://totp/ISSUER:ACCOUNT?secret=SECRET&issuer=ISSUER
        """
        if issuer is None:
            issuer = self.settings.organization_name

        import urllib.parse
        account = urllib.parse.quote(account_name)
        issuer_encoded = urllib.parse.quote(issuer)
        
        uri = f"otpauth://totp/{issuer_encoded}:{account}?secret={secret}&issuer={issuer_encoded}"
        return uri


# Global TOTP service instance
totp_service = TOTPService()