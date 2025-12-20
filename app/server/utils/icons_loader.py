# utils/icons_loader.py
from pathlib import Path
from fastapi import FastAPI # type: ignore
from fastapi.staticfiles import StaticFiles # type: ignore

def mount_icons(app: FastAPI) -> None:
    """
    Configures and mounts the static icons directory.
    Access via: http://host:port/icons/filename.png
    """
    # Resolve path relative to project root
    # Assuming this file is in /utils/, .parent is /utils, .parent.parent is root
    base_dir = Path(__file__).resolve().parent.parent
    icons_dir = base_dir / "icons"

    # Ensure the directory exists
    if not icons_dir.exists():
        icons_dir.mkdir(parents=True, exist_ok=True)
        print(f"📁 Created icons directory at: {icons_dir}")

    # Mount the static directory
    app.mount("/icons", StaticFiles(directory=icons_dir), name="icons")
    print(f"🖼️  Icons served at /icons")