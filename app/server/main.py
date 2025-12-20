# main.py
from fastapi import FastAPI # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore

from utils.database import init_db, ensure_default_profile
from utils.icons_loader import mount_icons  # ✅ Import the loader
from routers import health, profiles, buttons, button_config
from plugin.loadplugin import load_plugins
from plugin.registry import registry 

app = FastAPI(title="DockPilot API")

# ✅ 1. Mount Icons (Static Files)
# This needs to happen before routers so specific paths don't conflict
mount_icons(app)

# ✅ 2. CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production: ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    # 3. Initialize DB
    init_db()
    default_profile = ensure_default_profile()
    
    # 4. Load the plugins dynamically
    load_plugins()
    
    print("🚀 DockPilot started")
    print(f"👤 Default profile: {default_profile['profile_id']}")
    print("🧩 Loaded button types:", registry.list_types())

# ✅ 5. Routers Configuration

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(profiles.router, prefix="/profiles", tags=["profiles"])

# ⚠️ CRITICAL FIX: Load 'button_config' BEFORE 'buttons'
app.include_router(button_config.router) 

# Load 'buttons' last because it has the catch-all /{profile_id} route
app.include_router(buttons.router, prefix="/buttons", tags=["buttons"])