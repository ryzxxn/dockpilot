# plugin/trigger_api/main.py
from typing import Any, Dict, List
import requests
from plugin.base import ButtonPlugin
from plugin.registry import register
from .config import SCHEMA

class TriggerAPIButton(ButtonPlugin):
    @property
    def type(self) -> str:
        return "trigger_api"

    def get_schema(self) -> List[Dict[str, Any]]:
        return SCHEMA

    def validate_config(self, config: Dict[str, Any]) -> None:
        for field in SCHEMA:
            if field.get("required") and field["key"] not in config:
                raise ValueError(f"Field '{field['key']}' is required")
        
        if not config.get("url", "").startswith(("http://", "https://")):
            raise ValueError("URL must start with http or https")

    def execute(self, config: Dict[str, Any]) -> Any:
        method = config.get("method", "POST")
        
        try:
            response = requests.request(
                method=method,
                url=config["url"],
                headers=config.get("headers"),
                json=config.get("body"),
                timeout=config.get("timeout_ms", 5000) / 1000,
            )
            
            # ✅ FIX: Handle non-JSON responses gracefully
            try:
                return {
                    "status": response.status_code,
                    "data": response.json()
                }
            except ValueError:
                # If response is not JSON (e.g. 204 No Content, or plain text)
                return {
                    "status": response.status_code,
                    "text": response.text
                }
                
        except Exception as e:
            return {"error": str(e)}

register(TriggerAPIButton())