# routers/buttons.py
from fastapi import APIRouter, HTTPException # type: ignore
from pydantic import BaseModel # type: ignore
from datetime import datetime
import json

from utils.database import fetch_all, fetch_one, execute, generate_id
from plugin.registry import registry

router = APIRouter()

# --- Models ---
class ButtonCreate(BaseModel):
    profile_id: str
    label: str
    type: str

class ButtonUpdate(BaseModel):
    label: str

# --- Routes ---

@router.get("/button-types")
def get_button_types():
    """Return all available button types from registry"""
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


# ✅ NEW: Rename Button
@router.patch("/{button_id}")
def update_button_label(button_id: str, data: ButtonUpdate):
    execute(
        "UPDATE buttons SET label = ? WHERE button_id = ?",
        (data.label, button_id),
    )
    return {"status": "updated", "label": data.label}


# ✅ NEW: Delete Button
@router.delete("/{button_id}")
def delete_button(button_id: str):
    # Check if exists first
    button = fetch_one("SELECT button_id FROM buttons WHERE button_id = ?", (button_id,))
    if not button:
        raise HTTPException(status_code=404, detail="Button not found")

    execute("DELETE FROM buttons WHERE button_id = ?", (button_id,))
    return {"status": "deleted"}


@router.post("/{button_id}/trigger")
async def trigger_button(button_id: str):
    # 1. Get button
    button = fetch_one("SELECT * FROM buttons WHERE button_id = ?", (button_id,))
    if not button: 
        raise HTTPException(status_code=404, detail="Button not found")
    
    # 2. Get plugin
    plugin = registry.get_plugin(button["type"])
    if not plugin: 
        raise HTTPException(status_code=400, detail=f"Plugin type '{button['type']}' not loaded")
    
    # 3. Execute
    try:
        config = json.loads(button["config"]) if button["config"] else {}
        result = plugin.execute(config)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))