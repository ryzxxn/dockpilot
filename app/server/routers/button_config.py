# routers/button_config.py
import json
from typing import Any, Dict

from fastapi import APIRouter, HTTPException # type: ignore
from utils.database import fetch_one, execute
from plugin.registry import registry

router = APIRouter(
    prefix="/buttons",
    tags=["Button Config"],
)

@router.get("/schemas")
async def get_all_schemas():
    """Returns the schemas for all loaded plugins"""
    return {"plugins": registry.list_types_with_schemas()}

@router.get("/{button_id}/config")
async def get_button_config(button_id: str):
    """Retrieve the parsed config for a button."""
    button = fetch_one(
        "SELECT config FROM buttons WHERE button_id = ?",
        (button_id,),
    )

    if not button:
        raise HTTPException(status_code=404, detail="Button not found")

    try:
        # Return the saved config, or empty dict if NULL/empty
        config = json.loads(button["config"]) if button["config"] else {}
    except json.JSONDecodeError:
        config = {}

    return {"config": config}

@router.put("/{button_id}/config")
async def update_button_config(button_id: str, payload: Dict[str, Any]):
    """Update button config."""
    inner_config = payload.get("config")
    if inner_config is None:
        raise HTTPException(status_code=422, detail="Missing 'config' field")

    button = fetch_one("SELECT type FROM buttons WHERE button_id = ?", (button_id,))
    if not button:
        raise HTTPException(status_code=404, detail="Button not found")

    plugin = registry.get_plugin(button["type"])
    if not plugin:
        raise HTTPException(status_code=400, detail=f"Plugin {button['type']} not loaded")

    try:
        plugin.validate_config(inner_config)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    execute(
        "UPDATE buttons SET config = ? WHERE button_id = ?",
        (json.dumps(inner_config), button_id),
    )

    return {"status": "ok"}

# ✅ NEW ROUTE: Reset Config
@router.delete("/{button_id}/config")
async def reset_button_config(button_id: str):
    """Clear the configuration for a button."""
    execute(
        "UPDATE buttons SET config = '{}' WHERE button_id = ?",
        (button_id,),
    )
    return {"status": "cleared"}