from typing import List, Dict, Any

SCHEMA: List[Dict[str, Any]] = [
    {
        "key": "app_path",
        "label": "Application Path (.exe / .app)",
        "type": "string",
        "required": True,
        "placeholder": "C:\\Program Files\\Game\\game.exe",
        "default": ""
    },
    {
        "key": "arguments",
        "label": "Launch Arguments (Optional)",
        "type": "string",
        "required": False,
        "placeholder": "-windowed -debug",
        "default": ""
    },
    {
        "key": "run_as_admin",
        "label": "Run as Admin (Windows Only)",
        "type": "enum",
        "values": ["No", "Yes"],
        "default": "No"
    }
]