import json
import os
import asyncio
import httpx # type: ignore # ✅ Required for token exchange
from typing import Any, Dict, List
from pathlib import Path

# Try to import AioClient (Async)
try:
    from pypresence import AioClient # type: ignore
except ImportError:
    AioClient = None

from plugin.base import ButtonPlugin
from plugin.registry import register
# Ensure this matches your config file name
from .config import SCHEMA

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
TOKEN_FILE = DATA_DIR / "discord_token.json"

class DiscordManager:
    """
    Singleton to manage the Discord RPC connection.
    Handles Auth Code Exchange and Async Locking.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DiscordManager, cls).__new__(cls)
            cls._instance.client = None
            cls._instance.client_id = None
            cls._instance.client_secret = None
            cls._instance.lock = asyncio.Lock() 
        return cls._instance

    async def get_connected_client(self, client_id: str, client_secret: str):
        """
        Returns an authenticated Discord Client.
        """
        # Reset if credentials changed
        if self.client and (self.client_id != client_id):
            print("Credentials changed, resetting connection...")
            await self._reset_connection()

        if self.client:
            return self.client

        print(f"Connecting to Discord RPC (ID: {client_id})...")
        try:
            self.client_id = client_id
            self.client_secret = client_secret
            self.client = AioClient(client_id)
            
            await self.client.start()
            await self._authenticate()
            
            print("✅ Discord Connected")
            return self.client

        except Exception as e:
            print(f"❌ Connection Failed: {e}")
            await self._reset_connection()
            raise e

    async def _reset_connection(self):
        """
        Safely clears the client without killing the FastAPI Event Loop.
        """
        if self.client:
            try:
                # ⚠️ Do NOT call self.client.close() directly.
                # It tries to close the main event loop, crashing FastAPI.
                
                # Manually close the socket writer if it exists
                if hasattr(self.client, 'sock_writer') and self.client.sock_writer:
                    self.client.sock_writer.close()
            except Exception as e:
                print(f"Warning during close: {e}")
        
        self.client = None

    async def _authenticate(self):
        """
        Handles OAuth2 Token Logic:
        1. Checks saved token.
        2. If invalid, asks Discord for a Code.
        3. Exchanges Code + Secret for a new Token.
        """
        # 1. Try saved token
        access_token = None
        if TOKEN_FILE.exists():
            try:
                with open(TOKEN_FILE, "r") as f:
                    data = json.load(f)
                    if data.get("client_id") == self.client_id:
                        access_token = data.get("access_token")
            except Exception:
                pass

        scopes = ['rpc', 'rpc.voice.write', 'rpc.voice.read']
        
        # 2. Re-use token
        if access_token:
            try:
                await self.client.authenticate(access_token)
                return
            except Exception:
                print("Saved token invalid/expired, re-authorizing...")

        # 3. Request Authorization Code
        if not self.client_secret:
            raise ValueError("Client Secret is required for initial authorization!")

        print("Waiting for user to click Authorize in Discord...")
        # This returns a CODE, not a token
        code_response = await self.client.authorize(self.client_id, scopes)
        
        if 'data' not in code_response or 'code' not in code_response['data']:
             raise ValueError(f"Auth failed. Response: {code_response}")
             
        auth_code = code_response['data']['code']
        
        # 4. Exchange Code for Token (The missing step)
        print("Exchanging code for access token...")
        async with httpx.AsyncClient() as http:
            # Note: redirect_uri must match what you set in Discord Dev Portal
            resp = await http.post(
                "https://discord.com/api/oauth2/token",
                data={
                    "grant_type": "authorization_code",
                    "code": auth_code,
                    "redirect_uri": "http://localhost",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if resp.status_code != 200:
                raise ValueError(f"Token exchange failed: {resp.text}")
            
            token_data = resp.json()
            new_token = token_data['access_token']
        
        # 5. Authenticate & Save
        await self.client.authenticate(new_token)

        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(TOKEN_FILE, "w") as f:
            json.dump({
                "client_id": self.client_id, 
                "access_token": new_token,
                "refresh_token": token_data.get('refresh_token')
            }, f)


class DiscordControlPlugin(ButtonPlugin):
    @property
    def type(self) -> str:
        return "discord_control"

    def get_schema(self) -> List[Dict[str, Any]]:
        return SCHEMA

    def validate_config(self, config: Dict[str, Any]) -> None:
        if not config.get("client_id"):
            raise ValueError("Client ID is required")
        if not AioClient:
            raise ImportError("pypresence is not installed.")

    async def execute(self, config: Dict[str, Any]) -> Any:
        client_id = config.get("client_id")
        client_secret = config.get("client_secret", "").strip()
        action = config.get("action", "Toggle Mute")
        
        manager = DiscordManager()

        # ✅ CRITICAL: Use the lock to ensure only ONE request happens at a time
        async with manager.lock:
            try:
                rpc = await manager.get_connected_client(client_id, client_secret)
                
                # Retry logic for broken pipes
                try:
                    settings = await rpc.get_voice_settings()
                except Exception:
                    print("Pipe broken, reconnecting...")
                    await manager._reset_connection()
                    rpc = await manager.get_connected_client(client_id, client_secret)
                    settings = await rpc.get_voice_settings()

                if not settings or 'data' not in settings:
                    return {"error": "No voice status. Are you in a channel?"}
                
                data = settings['data']
                current_mute = data.get('mute', False)
                current_deaf = data.get('deaf', False)

                new_mute = current_mute
                new_deaf = current_deaf

                if action == "Toggle Mute":
                    new_mute = not current_mute
                    if new_mute: new_deaf = False 
                elif action == "Toggle Deafen":
                    new_deaf = not current_deaf
                    if new_deaf: new_mute = True
                elif action == "Mute On": new_mute = True
                elif action == "Mute Off": new_mute = False
                elif action == "Deafen On": new_deaf = True; new_mute = True
                elif action == "Deafen Off": new_deaf = False; new_mute = False 

                await rpc.set_voice_settings(mute=new_mute, deaf=new_deaf)
                
                msg = "Muted" if new_mute else "Unmuted"
                if new_deaf: msg += " & Deafened"
                
                return {"status": "success", "executed": msg}

            except Exception as e:
                # If we fail, clear connection so next try is fresh
                await manager._reset_connection()
                return {"error": str(e)}

register(DiscordControlPlugin())