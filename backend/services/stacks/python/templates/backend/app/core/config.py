import os
import secrets
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BACKEND_DIR / "data"

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 7

_SECRET_FILE = DATA_DIR / ".env.jwt_secret"


def _load_jwt_secret() -> str:
    """Use JWT_SECRET, or create one random secret and reuse it after restarts."""
    configured = os.environ.get("JWT_SECRET", "").strip()

    if configured:
        return configured

    if _SECRET_FILE.exists():
        return _SECRET_FILE.read_text(encoding="utf-8").strip()

    secret = secrets.token_urlsafe(48)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    _SECRET_FILE.write_text(secret, encoding="utf-8")
    return secret


JWT_SECRET = _load_jwt_secret()
