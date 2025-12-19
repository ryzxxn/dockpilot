# routers/buttons.py
from fastapi import APIRouter, HTTPException # type: ignore
from pydantic import BaseModel # type: ignore
from datetime import datetime
import json

# ✅ Added fetch_one
from utils.database import fetch_all, fetch_one, execute, generate_id
# ✅ Use the package import to get the correct 'registry' instance
from plugin.registry import registry

router = APIRouter()

class ButtonCreate(BaseModel):
    profile_id: str
    label: str
    type: str

# Note: ButtonConfig model and update route removed from here 
# because they are now handled in routers/button_config.py

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

@router.post("/{button_id}/trigger")
async def trigger_button(button_id: str):
    # 1. Get button from DB
    button = fetch_one("SELECT * FROM buttons WHERE button_id = ?", (button_id,))
    
    if not button: 
        raise HTTPException(status_code=404, detail="Button not found")
    
    # 2. Get plugin logic using the global registry instance
    plugin = registry.get_plugin(button["type"])
    
    if not plugin: 
        raise HTTPException(status_code=400, detail=f"Plugin type '{button['type']}' not loaded")
    
    # 3. Execute
    try:
        config = json.loads(button["config"]) if button["config"] else {}
        # The execute method is defined in your plugin logic
        result = plugin.execute(config)
        return {"status": "success", "result": result}
    except Exception as e:
        # Catch errors from the plugin (like API failures)
        raise HTTPException(status_code=500, detail=str(e))