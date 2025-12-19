# main.py
from fastapi import FastAPI # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore

from utils.database import init_db, ensure_default_profile
from routers import health, profiles, buttons, button_config
from plugin.loadplugin import load_plugins
# We use the clean import we set up in plugin/__init__.py
from plugin.registry import registry 

app = FastAPI(title="DockPilot API")

# ✅ CORS Configuration
app.add_middleware(
    CORSMiddleware,
    # In production, replace ["*"] with ["http://localhost:3000"]
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    # 1. Initialize DB
    init_db()
    default_profile = ensure_default_profile()
    
    # 2. Load the plugins dynamically
    load_plugins()
    
    print("🚀 DockPilot started")
    print(f"👤 Default profile: {default_profile['profile_id']}")
    
    # 3. List loaded types
    print("🧩 Loaded button types:", registry.list_types())

# ✅ Routers Configuration

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(profiles.router, prefix="/profiles", tags=["profiles"])

# ⚠️ CRITICAL FIX: Load 'button_config' BEFORE 'buttons'
# This router handles /buttons/schemas. If we load 'buttons' first, 
# FastAPI will think "schemas" is a profile_id and return 404/Empty List.
app.include_router(button_config.router) 

# Load 'buttons' last because it has the catch-all /{profile_id} route
app.include_router(buttons.router, prefix="/buttons", tags=["buttons"])