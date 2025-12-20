from typing import List, Dict, Any

SCHEMA: List[Dict[str, Any]] = [
    {
        "key": "client_id",
        "label": "Client ID",
        "type": "string",
        "required": True,
        "placeholder": "123456789...",
        "default": ""
    },
    {
        "key": "client_secret",
        "label": "Client Secret",
        "type": "string",
        "required": True,
        "placeholder": "Required for first-time auth",
        "default": ""
    },
    {
        "key": "action",
        "label": "Action",
        "type": "enum",
        "values": [
            "Toggle Mute", 
            "Toggle Deafen", 
            "Mute On", 
            "Mute Off", 
            "Deafen On", 
            "Deafen Off"
        ],
        "default": "Toggle Mute"
    }
]