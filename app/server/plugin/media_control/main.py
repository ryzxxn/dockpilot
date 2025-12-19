import pyautogui # type: ignore
from typing import Any, Dict, List
from plugin.base import ButtonPlugin
from plugin.registry import register
from .config import SCHEMA

class MediaControlPlugin(ButtonPlugin):
    @property
    def type(self) -> str:
        return "media_control"

    def get_schema(self) -> List[Dict[str, Any]]:
        return SCHEMA

    def validate_config(self, config: Dict[str, Any]) -> None:
        if "action" not in config:
            raise ValueError("Action is required")

    def execute(self, config: Dict[str, Any]) -> Any:
        action = config["action"]
        
        try:
            # Directly press the key on the host machine
            pyautogui.press(action)
            return {"status": "success", "executed": action}
        except Exception as e:
            return {"error": str(e)}

register(MediaControlPlugin())