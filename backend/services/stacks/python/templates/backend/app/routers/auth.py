import re
import threading

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import DUMMY_HASH, create_token, hash_password, verify_password
from app.dependencies.auth import get_current_user, public_user, users
from app.schemas.auth import LoginRequest, SignupRequest

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128

# The duplicate-email check and the insert must happen as one step
_signup_lock = threading.Lock()


def _normalize_email(email: str) -> str:
    return email.strip().lower()


@router.post("/signup", status_code=201)
def signup(body: SignupRequest):
    name = body.name.strip()
    email = _normalize_email(body.email)

    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    if not EMAIL_PATTERN.match(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address")

    if not MIN_PASSWORD_LENGTH <= len(body.password) <= MAX_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Password must be between {MIN_PASSWORD_LENGTH} and {MAX_PASSWORD_LENGTH} characters",
        )

    password_hash = hash_password(body.password)

    with _signup_lock:
        if users.find_one(lambda user: user["email"] == email):
            raise HTTPException(status_code=400, detail="An account with this email already exists")

        user = users.insert({"name": name, "email": email, "password": password_hash})

    return {"token": create_token(user["_id"]), "user": public_user(user)}


@router.post("/login")
def login(body: LoginRequest):
    email = _normalize_email(body.email)
    user = users.find_one(lambda record: record["email"] == email)

    password_ok = verify_password(
        body.password[:MAX_PASSWORD_LENGTH],
        user["password"] if user else DUMMY_HASH,
    )

    if user is None or not password_ok:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {"token": create_token(user["_id"]), "user": public_user(user)}


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}
