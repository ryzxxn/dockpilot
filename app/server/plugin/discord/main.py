from typing import Any, Dict
from plugin.base import ButtonPlugin
import requests # type: ignore
from plugin.registry import register

class DiscordSelfMuteButton(ButtonPlugin):
    type = "discord_self_mute"

    def validate_config(self, config: Dict[str, Any]) -> None:
        if "token" not in config or not config["token"]:
            raise ValueError("Discord user token is required")
        if "guild_id" not in config or not config["guild_id"]:
            raise ValueError("Guild ID is required")
        if "channel_id" not in config or not config["channel_id"]:
            raise ValueError("Voice channel ID is required")

    def schema(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "fields": [
                {"key": "token", "type": "string", "required": True},
                {"key": "guild_id", "type": "string", "required": True},
                {"key": "channel_id", "type": "string", "required": True},
                {"key": "mute", "type": "boolean", "default": False},
                {"key": "deafen", "type": "boolean", "default": False},
            ],
        }

    def execute(self, config: Dict[str, Any]) -> Any:
        """Toggle mute/deafen for the current user in a voice channel"""
        self.validate_config(config)

        headers = {
            "Authorization": config["token"],
            "Content-Type": "application/json",
        }

        payload = {
            "self_mute": config.get("mute", False),
            "self_deaf": config.get("deafen", False),
        }

        url = f"https://discord.com/api/v10/guilds/{config['guild_id']}/voice-states/@me"

        response = requests.patch(url, headers=headers, json=payload)

        if not response.ok:
            raise RuntimeError(
                f"Discord API error {response.status_code}: {response.text}"
            )

        return response.json()


register(DiscordSelfMuteButton())