@echo off
REM =========================================
REM Build script for DockPilot FastAPI app (with uv environment)
REM =========================================

REM --- Configuration ---
SET MAIN_SCRIPT=main.py
SET DIST_DIR=dist
SET BUILD_DIR=build
SET ENV_DIR=.venv

REM --- List of folders to include in the build ---
SET INCLUDE_FOLDERS=data icons plugin routers utils

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

REM --- Enable delayed expansion for FOR loop variables ---
SETLOCAL ENABLEDELAYEDEXPANSION

REM --- Prepare --add-data arguments for folders ---
SET ADD_DATA_ARGS=
FOR %%F IN (%INCLUDE_FOLDERS%) DO (
    SET ADD_DATA_ARGS=!ADD_DATA_ARGS! --add-data "%%F;%%F"
)

REM --- Run PyInstaller with hidden imports for dynamic modules ---
echo Running PyInstaller...
python -m PyInstaller --onefile !ADD_DATA_ARGS! ^
    --hidden-import=plugin.loadplugin ^
    --hidden-import=plugin.registry ^
    --hidden-import=routers.health ^
    --hidden-import=routers.profiles ^
    --hidden-import=routers.buttons ^
    --hidden-import=routers.button_config ^
    %MAIN_SCRIPT%

REM --- Deactivate environment ---
deactivate

REM --- Done ---
echo Build complete!
echo Your .exe is in the %DIST_DIR% folder.
pause
