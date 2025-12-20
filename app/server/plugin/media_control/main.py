import sys
import subprocess
from typing import Any, Dict, List
from plugin.base import ButtonPlugin
from plugin.registry import register
from .config import SCHEMA

# Try importing pyautogui for Windows/Linux
try:
    import pyautogui # type: ignore
    PYAUTOGUI_AVAILABLE = True
    pyautogui.FAILSAFE = False 
except ImportError:
    PYAUTOGUI_AVAILABLE = False

class MediaControlPlugin(ButtonPlugin):
    @property
    def type(self) -> str:
        return "media_control"

    def get_schema(self) -> List[Dict[str, Any]]:
        return SCHEMA

    def validate_config(self, config: Dict[str, Any]) -> None:
        if "action" not in config:
            raise ValueError("Action is required")
        
        # Only check for pyautogui if NOT on Mac
        if sys.platform != "darwin" and not PYAUTOGUI_AVAILABLE:
            raise ImportError("pyautogui is not installed. Run 'uv add pyautogui'")

    def _execute_macos(self, action: str) -> None:
        """
        Executes media commands on macOS using native 'osascript'.
        This is more reliable than pyautogui for media keys on Mac.
        """
        script = ""
        
        if action == "playpause":
            # Toggle Play/Pause
            script = 'tell application "System Events" to key code 16'
        
        elif action == "nexttrack":
            # Next Track
            script = 'tell application "System Events" to key code 19'
        
        elif action == "prevtrack":
            # Previous Track
            script = 'tell application "System Events" to key code 20'
        
        elif action == "volumeup":
            # Volume Up (approx 6-7%)
            script = "set volume output volume (output volume of (get volume settings) + 6)"
        
        elif action == "volumedown":
            # Volume Down
            script = "set volume output volume (output volume of (get volume settings) - 6)"
        
        elif action == "volumemute":
            # Toggle Mute
            script = "set volume output muted not (output muted of (get volume settings))"
        
        elif action == "stop":
            # Not standard on Mac keyboards, usually just pause
            script = 'tell application "System Events" to key code 16'
        
        if script:
            # Run the applescript command
            subprocess.run(["osascript", "-e", script], check=True)

    def execute(self, config: Dict[str, Any]) -> Any:
        action = config.get("action", "").lower()
        
        try:
            # --- MACOS HANDLING ---
            if sys.platform == "darwin":
                self._execute_macos(action)
                return {"status": "success", "executed": f"Mac {action}"}

            # --- WINDOWS / LINUX HANDLING ---
            else:
                if not PYAUTOGUI_AVAILABLE:
                    return {"error": "pyautogui missing"}
                
                # Standard key names for pyautogui
                key_map = {
                    "playpause": "playpause",
                    "nexttrack": "nexttrack",
                    "prevtrack": "prevtrack",
                    "volumeup": "volumeup",
                    "volumedown": "volumedown",
                    "volumemute": "volumemute",
                    "stop": "stop" 
                }

                if action in key_map:
                    pyautogui.press(key_map[action])
                    return {"status": "success", "executed": action}
                else:
                    return {"error": f"Unknown action: {action}"}

        except Exception as e:
            return {"error": str(e)}

register(MediaControlPlugin())