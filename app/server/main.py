from fastapi import FastAPI  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore

from utils.database import init_db, ensure_default_profile
from utils.icons_loader import mount_icons
from routers import health, profiles, buttons, button_config
from plugin.loadplugin import load_plugins
from plugin.registry import registry 
import sys
import os
import socket
from zeroconf import ServiceInfo, Zeroconf

app = FastAPI(title="DockPilot API")

# --- Helper to access bundled data in PyInstaller ---
def get_path(rel_path):
    try:
        base_path = sys._MEIPASS  # PyInstaller temp folder
    except AttributeError:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, rel_path)

# ✅ Mount Icons (Static Files)
mount_icons(app)  # Ensure mount_icons uses get_path internally for PyInstaller

# ✅ CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    # Initialize DB
    init_db()
    default_profile = ensure_default_profile()
    
    # Load plugins dynamically
    load_plugins()
    
    print("🚀 DockPilot started")
    print(f"👤 Default profile: {default_profile['profile_id']}")
    print("🧩 Loaded button types:", registry.list_types())

# ✅ Routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
app.include_router(button_config.router)  # Must load before buttons
app.include_router(buttons.router, prefix="/buttons", tags=["buttons"])

# --- mDNS broadcasting ---
def broadcast_mdns(name="dockpilot", port=9090):
    zeroconf = Zeroconf()
    # Get local IP address
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    info = ServiceInfo(
        "_http._tcp.local.",
        f"{name}._http._tcp.local.",
        addresses=[socket.inet_aton(local_ip)],
        port=port,
        properties={},
        server=f"{name}.local."
    )
    zeroconf.register_service(info)
    print(f"🟢 mDNS service registered: {name}.local:{port}")
    return zeroconf, info

def stop_mdns(zeroconf, info):
    zeroconf.unregister_service(info)
    zeroconf.close()
    print("🛑 mDNS service stopped")

# ✅ ENTRY POINT
if __name__ == "__main__":
    import uvicorn
    PORT = 9090
    zeroconf, info = broadcast_mdns(name="dockpilot", port=PORT)
    try:
        uvicorn.run(app, host="0.0.0.0", port=PORT)
    finally:
        stop_mdns(zeroconf, info)
