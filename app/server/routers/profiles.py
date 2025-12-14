from datetime import datetime
from fastapi import APIRouter # type: ignore

from utils.database import execute, fetch_all
from utils.schema import ProfileCreate, generate_id

router = APIRouter()


@router.post("/")
def create_profile(payload: ProfileCreate):
    profile_id = generate_id()

    execute(
        """
        INSERT INTO profiles (profile_id, name, created_at)
        VALUES (?, ?, ?)
        """,
        (profile_id, payload.name, datetime.utcnow().isoformat()),
    )

    return {"profile_id": profile_id}


@router.get("/")
def list_profiles():
    return fetch_all("SELECT * FROM profiles")
