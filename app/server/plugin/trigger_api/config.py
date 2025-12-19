# plugin/trigger_api/config.py

SCHEMA = [
    {"key": "url", "label": "API URL", "type": "string", "required": True, "placeholder": "https://api.example.com/webhook"},
    {
        "key": "method", 
        "label": "HTTP Method", 
        "type": "enum", 
        "values": ["GET", "POST", "PUT", "DELETE"], 
        "default": "POST"
    },
    {"key": "headers", "label": "Headers (JSON)", "type": "json", "default": {}},
    {"key": "body", "label": "Payload (JSON)", "type": "json", "default": {}},
    {"key": "timeout_ms", "label": "Timeout (ms)", "type": "number", "default": 5000},
]