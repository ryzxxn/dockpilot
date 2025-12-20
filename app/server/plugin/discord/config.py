from typing import List, Dict, Any

SCHEMA: List[Dict[str, Any]] = [
    {
        "key": "client_id",
        "label": "Client ID (From Discord Dev Portal)",
        "type": "string",
        "required": True,
        "placeholder": "123456789...",
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