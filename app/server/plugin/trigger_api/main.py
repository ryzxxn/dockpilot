from typing import Any, Dict
from plugin.base import ButtonPlugin
import requests # type: ignore
from plugin.registry import register

class TriggerAPIButton(ButtonPlugin):
    type = "trigger_api"

    def validate_config(self, config: Dict[str, Any]) -> None:
        if "url" not in config:
            raise ValueError("url is required")

        if not config["url"].startswith(("http://", "https://")):
            raise ValueError("url must be http or https")

        method = config.get("method", "POST")
        if method not in {"GET", "POST", "PUT", "DELETE", "PATCH"}:
            raise ValueError("invalid http method")

        headers = config.get("headers", {})
        if not isinstance(headers, dict):
            raise ValueError("headers must be an object")

        body = config.get("body", {})
        if body is not None and not isinstance(body, (dict, list)):
            raise ValueError("body must be json")

    def schema(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "fields": [
                {"key": "url", "type": "string", "required": True},
                {
                    "key": "method",
                    "type": "enum",
                    "values": ["GET", "POST", "PUT", "DELETE", "PATCH"],
                    "default": "POST",
                },
                {"key": "headers", "type": "json"},
                {"key": "body", "type": "json"},
                {"key": "timeout_ms", "type": "number", "default": 5000},
            ],
        }

    def execute(self, config: Dict[str, Any]) -> Any:
        """Actually call the API/webhook"""
        self.validate_config(config)
        method = config.get("method", "POST")
        response = requests.request(
            method=method,
            url=config["url"],
            headers=config.get("headers"),
            json=config.get("body"),
            timeout=config.get("timeout_ms", 5000) / 1000,  # ms -> seconds
        )
        return response.json()  # or response.text depending on API

register(TriggerAPIButton())