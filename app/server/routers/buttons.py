# routers/buttons.py
from fastapi import APIRouter, HTTPException # type: ignore
from pydantic import BaseModel # type: ignore
from datetime import datetime
from typing import Optional
from pathlib import Path
import json
import inspect  # ✅ REQUIRED for detecting async plugins

from utils.database import fetch_all, fetch_one, execute, generate_id
from plugin.registry import registry

router = APIRouter()

# Define Path to Icons (Relative to this file)
BASE_DIR = Path(__file__).resolve().parent.parent
ICONS_DIR = BASE_DIR / "icons"

# --- Models ---
class ButtonCreate(BaseModel):
    profile_id: str
    label: str
    type: str

class ButtonUpdate(BaseModel):
    label: Optional[str] = None
    icon: Optional[str] = None

# --- Routes ---

@router.get("/assets/icons")
def list_available_icons():
    """Scans the /icons directory and returns valid image filenames."""
    if not ICONS_DIR.exists():
        return {"icons": []}
    
    valid_extensions = {".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif"}
    
    icons = [
        f.name for f in ICONS_DIR.iterdir() 
        if f.is_file() and f.suffix.lower() in valid_extensions
    ]
    
    return {"icons": sorted(icons)}


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
        INSERT INTO buttons (button_id, profile_id, type, label, icon, config, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            button_id,
            data.profile_id,
            data.type,
            data.label,
            None, # Default icon is NULL
            json.dumps({}),
            datetime.utcnow().isoformat(),
        ),
    )
    return {"button_id": button_id}


@router.patch("/{button_id}")
def update_button_details(button_id: str, data: ButtonUpdate):
    # Dynamically build the update query
    fields = []
    values = []

    if data.label is not None:
        fields.append("label = ?")
        values.append(data.label)
    
    if data.icon is not None:
        fields.append("icon = ?")
        values.append(data.icon)

    if not fields:
        return {"status": "no_change", "message": "No fields provided"}

    values.append(button_id)
    query = f"UPDATE buttons SET {', '.join(fields)} WHERE button_id = ?"

    try:
        execute(query, tuple(values))
        return {"status": "updated", "updated_fields": fields}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{button_id}")
def delete_button(button_id: str):
    button = fetch_one("SELECT button_id FROM buttons WHERE button_id = ?", (button_id,))
    if not button:
        raise HTTPException(status_code=404, detail="Button not found")

    execute("DELETE FROM buttons WHERE button_id = ?", (button_id,))
    return {"status": "deleted"}


# ✅ UPDATED: Handles both Async and Sync plugins
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
        
        # Check if the execute method is an async coroutine
        if inspect.iscoroutinefunction(plugin.execute):
            result = await plugin.execute(config) # ✅ Await async plugins (Discord)
        else:
            result = plugin.execute(config)       # ✅ Call sync plugins directly (App Launcher)
            
        return {"status": "success", "result": result}
    except Exception as e:
        print(f"Trigger Error: {e}") # Log to console
        raise HTTPException(status_code=500, detail=str(e))