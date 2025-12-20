import json
import os
import time
from typing import Any, Dict, List
from pathlib import Path

# Third-party library
try:
    from pypresence import Client
except ImportError:
    Client = None

from plugin.base import ButtonPlugin
from plugin.registry import register
from .config import SCHEMA

# --- PERSISTENCE HELPERS ---
# We need to save the saved Auth Token so the user doesn't have to 
# click "Authorize" in Discord every time the server restarts.
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
TOKEN_FILE = DATA_DIR / "discord_token.json"

class DiscordManager:
    """
    Singleton class to keep the Discord RPC connection alive.
    Re-connecting on every button press is too slow.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DiscordManager, cls).__new__(cls)
            cls._instance.client = None
            cls._instance.client_id = None
            cls._instance.connected = False
        return cls._instance

    def connect(self, client_id: str):
        # If we are already connected with the same ID, do nothing
        if self.connected and self.client and self.client_id == client_id:
            return self.client

        try:
            # Initialize Client
            self.client_id = client_id
            self.client = Client(client_id)
            self.client.start()
            self.connected = True
            
            # Authenticate / Authorize
            self._authenticate()
            
            return self.client
        except Exception as e:
            print(f"Discord Connection Error: {e}")
            self.connected = False
            self.client = None
            raise e

    def _authenticate(self):
        """
        Handles the OAuth2 flow via RPC.
        Discord App will pop up asking for permission on first run.
        """
        # 1. Load existing token if available
        access_token = None
        if TOKEN_FILE.exists():
            try:
                with open(TOKEN_FILE, "r") as f:
                    data = json.load(f)
                    if data.get("client_id") == self.client_id:
                        access_token = data.get("access_token")
            except:
                pass

        # 2. Authorize
        # rpc.voice.write is required to mute/deafen
        scopes = ['rpc', 'rpc.voice.write', 'rpc.voice.read']
        
        if access_token:
            try:
                # Try to use existing token
                self.client.authenticate(access_token)
                return
            except Exception:
                print("Saved token invalid, re-authorizing...")

        # 3. New Authorization (Pop up in Discord)
        # This returns a code, which pypresence automatically exchanges for a token
        auth_data = self.client.authorize(self.client_id, scopes)
        new_token = auth_data['data']['access_token']
        
        # 4. Authenticate with new token
        self.client.authenticate(new_token)

        # 5. Save token
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(TOKEN_FILE, "w") as f:
            json.dump({"client_id": self.client_id, "access_token": new_token}, f)


class DiscordControlPlugin(ButtonPlugin):
    @property
    def type(self) -> str:
        return "discord"

    def get_schema(self) -> List[Dict[str, Any]]:
        return SCHEMA

    def validate_config(self, config: Dict[str, Any]) -> None:
        if not config.get("client_id"):
            raise ValueError("Client ID is required")
        if not Client:
            raise ImportError("pypresence is not installed. Run 'uv add pypresence'")

    def execute(self, config: Dict[str, Any]) -> Any:
        client_id = config.get("client_id")
        action = config.get("action", "Toggle Mute")
        
        manager = DiscordManager()

        try:
            # 1. Get or Create Connection
            rpc = manager.connect(client_id)
            
            # 2. Get Current Voice State
            # We need this to toggle, or to know if we are even in a channel
            # get_voice_settings() returns the local mute state
            settings = rpc.get_voice_settings()
            
            if not settings:
                return {"error": "Could not fetch Discord settings. Is Discord running?"}
            
            data = settings.get('data', {})
            current_mute = data.get('mute', False)
            current_deaf = data.get('deaf', False)

            # 3. Determine New State
            new_mute = current_mute
            new_deaf = current_deaf

            if action == "Toggle Mute":
                new_mute = not current_mute
                # If we unmute, we usually want to undeafen too, handled by Discord logic usually
                if new_mute: new_deaf = False 
            
            elif action == "Toggle Deafen":
                new_deaf = not current_deaf
                # Deafening automatically mutes in Discord
                if new_deaf: new_mute = True
                
            elif action == "Mute On": new_mute = True
            elif action == "Mute Off": new_mute = False
            elif action == "Deafen On": 
                new_deaf = True
                new_mute = True
            elif action == "Deafen Off": 
                new_deaf = False
                # Optionally unmute too, or keep mute? Usually Deafen Off implies Unmute
                new_mute = False 

            # 4. Apply Settings
            rpc.set_voice_settings(
                mute=new_mute,
                deaf=new_deaf
            )

            status_msg = []
            if new_mute: status_msg.append("Muted")
            else: status_msg.append("Unmuted")
            
            if new_deaf: status_msg.append("Deafened")
            
            return {"status": "success", "executed": ", ".join(status_msg)}

        except Exception as e:
            # Reset connection on error
            manager.connected = False
            return {"error": str(e)}

register(DiscordControlPlugin())