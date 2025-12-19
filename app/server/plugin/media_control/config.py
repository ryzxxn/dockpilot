# plugin/media_control/config.py

SCHEMA = [
    {
        "key": "action",
        "label": "Action",
        "type": "enum",
        "required": True,
        "values": [
            "volumeup", 
            "volumedown", 
            "volumemute",
            "playpause",
            "nexttrack",
            "prevtrack"
        ],
        "default": "volumeup"
    }
]