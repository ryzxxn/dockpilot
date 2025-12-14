from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
import json

from utils.database import fetch_all, execute, generate_id
from plugin import registry

router = APIRouter()


class ButtonCreate(BaseModel):
    profile_id: str
    label: str
    type: str


class ButtonConfig(BaseModel):
    config: dict


# ✅ STATIC ROUTE FIRST
@router.get("/button-types")
def get_button_types():
    """Return all available button types"""
    return {"types": registry.list_types()}


@router.get("/{profile_id}")
def list_buttons(profile_id: str):
    return fetch_all(
        "SELECT * FROM buttons WHERE profile_id = ?",
        (profile_id,),
    )


@router.post("/")
def create_button(data: ButtonCreate):
    button_id = generate_id()

    execute(
        """
        INSERT INTO buttons (button_id, profile_id, type, label, config, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            button_id,
            data.profile_id,
            data.type,
            data.label,
            json.dumps({}),
            datetime.utcnow().isoformat(),
        ),
    )

    return {"button_id": button_id}


@router.put("/{button_id}/config")
def update_button_config(button_id: str, body: ButtonConfig):
    execute(
        "UPDATE buttons SET config = ? WHERE button_id = ?",
        (json.dumps(body.config), button_id),
    )

    return {"status": "ok"}
