import json
from typing import Any, Dict

from fastapi import APIRouter, HTTPException # type: ignore

from utils.database import fetch_one, execute

router = APIRouter(
    prefix="/buttons",
    tags=["Button Config"],
)

# ---------------------------------------------------------------------
# Validators
# ---------------------------------------------------------------------

def validate_trigger_api_config(config: Dict[str, Any]) -> None:
    if not isinstance(config, dict):
        raise ValueError("config must be an object")

    if "url" not in config:
        raise ValueError("url is required")

    if not isinstance(config["url"], str):
        raise ValueError("url must be a string")

    if not config["url"].startswith(("http://", "https://")):
        raise ValueError("url must start with http:// or https://")

    method = config.get("method", "POST")
    if method not in {"GET", "POST", "PUT", "DELETE", "PATCH"}:
        raise ValueError("invalid HTTP method")

    headers = config.get("headers", {})
    if not isinstance(headers, dict):
        raise ValueError("headers must be an object")

    body = config.get("body")
    if body is not None and not isinstance(body, (dict, list)):
        raise ValueError("body must be valid JSON")


BUTTON_CONFIG_VALIDATORS = {
    "trigger_api": validate_trigger_api_config,
}

# ---------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------

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
        config = json.loads(button["config"]) if button["config"] else {}
    except json.JSONDecodeError:
        config = {}

    return {"config": config}


@router.put("/{button_id}/config")
async def update_button_config(button_id: str, payload: Dict[str, Any]):
    """Update button config. Expects { "config": { ... } }."""
    inner_config = payload.get("config")
    if inner_config is None:
        raise HTTPException(status_code=422, detail="Request body must contain 'config' field")

    button = fetch_one(
        "SELECT type FROM buttons WHERE button_id = ?",
        (button_id,),
    )

    if not button:
        raise HTTPException(status_code=404, detail="Button not found")

    validator = BUTTON_CONFIG_VALIDATORS.get(button["type"])
    if not validator:
        raise HTTPException(status_code=400, detail=f"Unsupported button type: {button['type']}")

    try:
        validator(inner_config)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    execute(
        "UPDATE buttons SET config = ? WHERE button_id = ?",
        (json.dumps(inner_config), button_id),
    )

    return {"status": "ok", "config": inner_config}