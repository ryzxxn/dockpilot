import sys
import os
import socket
import subprocess
import ctypes
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# --- Your Module Imports ---
from utils.database import init_db, ensure_default_profile
from utils.icons_loader import mount_icons
from routers import health, profiles, buttons, button_config
from plugin.loadplugin import load_plugins
from plugin.registry import registry

# ==============================
# Helper: Get True LAN IP
# ==============================
def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip

# ==============================
# Helper: Force Firewall Open for EXE
# ==============================
def force_firewall_rule(port):
    if sys.platform == "win32":
        rule_name = "DockPilot_EXE_Access"
        # Get the absolute path of the running EXE
        exe_path = os.path.abspath(sys.executable)
        
        # PowerShell command: Remove old rule if exists, add new rule specifically for THIS exe path
        cmd = (
            f'Remove-NetFirewallRule -DisplayName "{rule_name}" -ErrorAction SilentlyContinue; '
            f'New-NetFirewallRule -DisplayName "{rule_name}" -Direction Inbound -LocalPort {port} '
            f'-Protocol TCP -Action Allow -Program "{exe_path}" -Profile Any'
        )
        
        try:
            subprocess.run(["powershell", "-Command", cmd], capture_output=True, shell=True)
            print(f"🛡️ Firewall: Port {port} opened for {os.path.basename(exe_path)}")
        except Exception as e:
            print(f"⚠️ Firewall injection failed: {e}")

# ==============================
# Lifespan (Replaces on_event)
# ==============================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    ensure_default_profile()
    load_plugins()
    
    lan_ip = get_local_ip()
    print("\n" + "!"*40)
    print(f"🚀 EXE SERVER ONLINE")
    print(f"🔗 LAN URL: http://{lan_ip}:9090")
    print("!"*40 + "\n")
    yield
    # Shutdown logic (optional)

# ==============================
# App Setup
# ==============================
app = FastAPI(title="DockPilot API", lifespan=lifespan)

mount_icons(app)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
app.include_router(button_config.router)
app.include_router(buttons.router, prefix="/buttons", tags=["buttons"])

if __name__ == "__main__":
    PORT = 9090
    
    if sys.platform == "win32":
        # Force Admin Elevation so we can modify Firewall
        if not ctypes.windll.shell32.IsUserAnAdmin():
            print("Requesting Administrator privileges to unlock LAN access...")
            ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, " ".join(sys.argv), None, 1)
            sys.exit(0)
        else:
            force_firewall_rule(PORT)

    uvicorn.run(app, host="0.0.0.0", port=PORT)