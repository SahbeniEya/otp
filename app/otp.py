import hashlib
import hmac
import secrets
import string
from dataclasses import dataclass
from typing import Optional, Tuple

from .config import get_settings


@dataclass
class OTP:
    id: str
    subject: Optional[str]
    purpose: Optional[str]
    ttl_seconds: int


def compute_hmac(pepper: bytes, code: str, salt: str) -> str:
    # HMAC_SHA256( pepper || code || salt ) with pepper as key
    msg = (code + salt).encode("utf-8")
    return hmac.new(pepper, msg, hashlib.sha256).hexdigest()


def _hash_code(code: str, salt: str) -> str:
    s = get_settings()
    pepper_bytes = s.otp_pepper.encode("utf-8")
    return compute_hmac(pepper_bytes, code, salt)


def generate_code(length: int, charset: Optional[str] = None) -> str:
    s = get_settings()
    if not charset:
        charset = s.otp_charset

    # Support for different OTP types
    if charset in ("digits", "numeric", "d", "0123456789"):
        alphabet = string.digits  # 0123456789
    elif charset in ("alnum", "alphanumeric", "a"):
        alphabet = string.ascii_letters + string.digits  # abcABC123
    elif charset in ("alpha", "alphabet", "letters"):
        alphabet = string.ascii_letters  # abcdefABCDEF
    elif charset in ("upper", "uppercase"):
        alphabet = string.ascii_uppercase  # ABCDEFGH
    elif charset in ("lower", "lowercase"):
        alphabet = string.ascii_lowercase  # abcdefgh
    elif charset in ("hex", "hexadecimal", "x"):
        alphabet = string.hexdigits.lower()  # 0123456789abcdef
    elif charset in ("symbols", "special"):
        alphabet = "!@#$%^&*"  # Special characters
    else:
        # fallback: interpret as literal alphabet or use default
        alphabet = charset if len(charset) > 1 else s.otp_charset

    # Deduplicate preserving order and ensure we have valid characters
    if alphabet:
        alphabet = "".join(sorted(set(alphabet), key=alphabet.index))

    # Final fallback to digits if empty
    if not alphabet:
        alphabet = string.digits

    return "".join(secrets.choice(alphabet) for _ in range(length))


def new_otp_id() -> str:
    return "otp_" + secrets.token_urlsafe(12)


def hash_code_with_salt(code: str, salt: Optional[str] = None) -> Tuple[str, str]:
    if not salt:
        salt = secrets.token_hex(16)
    return _hash_code(code, salt), salt


def verify_code(code: str, expected_hmac: str, salt: str) -> bool:
    return hmac.compare_digest(_hash_code(code, salt), expected_hmac)
