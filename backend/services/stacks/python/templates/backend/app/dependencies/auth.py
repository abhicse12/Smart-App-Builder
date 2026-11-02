from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_token
from app.storage.json_store import JsonCollection

_bearer = HTTPBearer(auto_error=False)
users = JsonCollection("users")


def public_user(user: dict) -> dict:
    """The user fields that may leave the server (never the password hash)."""
    return {"_id": user["_id"], "name": user["name"], "email": user["email"]}


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    """Protect a route: Depends(get_current_user) returns { _id, name, email }."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    user_id = decode_token(credentials.credentials)
    user = users.get(user_id) if user_id else None

    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return public_user(user)
