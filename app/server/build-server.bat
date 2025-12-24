@echo off
REM =========================================
REM Build script for DockPilot FastAPI app (with Firewall & Lifespan Support)
REM =========================================

REM --- Configuration ---
SET MAIN_SCRIPT=main.py
SET DIST_DIR=dist
SET BUILD_DIR=build
SET ENV_DIR=.venv

REM --- List of folders to include in the build ---
SET INCLUDE_FOLDERS=data icons plugin routers utils

REM --- List of plugin dependencies to install ---
SET PLUGIN_DEPS=pyautogui httpx requests

REM --- Clean previous builds ---
echo Cleaning previous builds...
IF EXIST %DIST_DIR% rmdir /s /q %DIST_DIR%
IF EXIST %BUILD_DIR% rmdir /s /q %BUILD_DIR%
IF EXIST %MAIN_SCRIPT%.spec del /q %MAIN_SCRIPT%.spec

REM --- Sync uv environment ---
echo Syncing uv environment...
uv sync

REM --- Activate uv environment ---
echo Activating environment...
call %ENV_DIR%\Scripts\activate.bat

REM --- Ensure PyInstaller is installed ---
echo Checking PyInstaller...
python -m pip show pyinstaller >nul 2>&1
IF ERRORLEVEL 1 (
    echo PyInstaller not found. Installing...
    python -m pip install pyinstaller
)

REM --- Install plugin dependencies ---
echo Installing plugin dependencies...
FOR %%D IN (%PLUGIN_DEPS%) DO (
    python -m pip show %%D >nul 2>&1
    IF ERRORLEVEL 1 (
        echo Installing %%D...
        python -m pip install %%D
    )
)

REM --- Enable delayed expansion for FOR loop variables ---
SETLOCAL ENABLEDELAYEDEXPANSION

REM --- Prepare --add-data arguments for folders ---
SET ADD_DATA_ARGS=
FOR %%F IN (%INCLUDE_FOLDERS%) DO (
    SET ADD_DATA_ARGS=!ADD_DATA_ARGS! --add-data "%%F;%%F"
)

REM --- Run PyInstaller ---
echo Running PyInstaller with UAC elevation and Uvicorn protocols...
python -m PyInstaller --onefile --uac-admin --clean !ADD_DATA_ARGS! ^
    --hidden-import=uvicorn.logging ^
    --hidden-import=uvicorn.loops ^
    --hidden-import=uvicorn.loops.auto ^
    --hidden-import=uvicorn.protocols ^
    --hidden-import=uvicorn.protocols.http ^
    --hidden-import=uvicorn.protocols.http.auto ^
    --hidden-import=uvicorn.lifespan ^
    --hidden-import=uvicorn.lifespan.on ^
    --hidden-import=plugin.loadplugin ^
    --hidden-import=plugin.registry ^
    --hidden-import=routers.health ^
    --hidden-import=routers.profiles ^
    --hidden-import=routers.buttons ^
    --hidden-import=routers.button_config ^
    --hidden-import=plugin.media_control.main ^
    --hidden-import=plugin.discord.main ^
    --hidden-import=plugin.trigger_api.main ^
    --hidden-import=pyautogui ^
    --hidden-import=httpx ^
    --hidden-import=requests ^
    --name="DockPilot" ^
    %MAIN_SCRIPT%

REM --- Deactivate environment ---
deactivate

REM --- Done ---
echo Build complete!
echo Your elevated .exe is in the %DIST_DIR% folder.
pause