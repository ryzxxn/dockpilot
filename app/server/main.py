from fastapi import FastAPI # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore

from utils.database import init_db, ensure_default_profile
from routers import health
from routers import profiles
from routers import buttons

app = FastAPI(title="DockPilot API")

# CORS (safe for local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import plugin.trigger_api.main
import plugin.discord.main


@app.on_event("startup")
async def startup():
    init_db()
    default_profile = ensure_default_profile()
    print("🚀 DockPilot started")
    print("🧩 Default profile:", default_profile["profile_id"])
    print("🧩 Loaded button types:", __import__("plugin.registry").registry.list_types())

# Routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
app.include_router(buttons.router, prefix="/buttons", tags=["buttons"])
