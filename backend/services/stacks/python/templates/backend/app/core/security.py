import base64
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import JWT_ALGORITHM, JWT_EXPIRE_DAYS, JWT_SECRET

# scrypt parameters (about 16 MB of memory per hash)
_N = 2**14
_R = 8
_P = 1


def _scrypt(password: str, salt: bytes) -> bytes:
    return hashlib.scrypt(password.encode("utf-8"), salt=salt, n=_N, r=_R, p=_P, dklen=32)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    encoded_salt = base64.b64encode(salt).decode("ascii")
    encoded_hash = base64.b64encode(_scrypt(password, salt)).decode("ascii")
    return f"scrypt${encoded_salt}${encoded_hash}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        _, encoded_salt, encoded_hash = stored_hash.split("$")
        salt = base64.b64decode(encoded_salt)
        expected = base64.b64decode(encoded_hash)
    except (ValueError, AttributeError):
        return False

    return hmac.compare_digest(_scrypt(password, salt), expected)


# Verified when the email is unknown, so both cases take the same time
DUMMY_HASH = hash_password(base64.b64encode(os.urandom(16)).decode("ascii"))


def create_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> str | None:
    """Return the user id of a valid token, otherwise None."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None

    return payload.get("sub")
