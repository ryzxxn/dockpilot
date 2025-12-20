import os
import subprocess
import shlex
import sys
from typing import Any, Dict, List
from plugin.base import ButtonPlugin
from plugin.registry import register

# We import the schema from the specific config file to avoid conflicts in the impl folder
from .config import SCHEMA

class AppLauncherPlugin(ButtonPlugin):
    @property
    def type(self) -> str:
        return "app_launcher"

    def get_schema(self) -> List[Dict[str, Any]]:
        return SCHEMA

    def validate_config(self, config: Dict[str, Any]) -> None:
        if not config.get("app_path"):
            raise ValueError("Application path is required")

    def execute(self, config: Dict[str, Any]) -> Any:
        app_path = config.get("app_path", "")
        arguments = config.get("arguments", "")
        run_as_admin = config.get("run_as_admin", "No")

        # 1. Validation and Path Normalization
        normalized_path = os.path.normpath(app_path)
        if not os.path.exists(normalized_path):
            return {"error": f"File not found: {normalized_path}"}

        # 2. Set Working Directory (Critical for apps to load assets)
        working_dir = os.path.dirname(normalized_path)

        # 3. Parse Arguments
        try:
            args_list = shlex.split(arguments)
        except Exception:
            args_list = []

        try:
            # --- Windows Execution ---
            if sys.platform == "win32":
                if run_as_admin == "Yes":
                    # Admin Launch via ctypes (ShellExecute)
                    import ctypes
                    params = arguments if arguments else ""
                    
                    # ShellExecuteW(hwnd, operation, file, params, dir, show_cmd)
                    # 1 = SW_SHOWNORMAL
                    result = ctypes.windll.shell32.ShellExecuteW(
                        None, "runas", normalized_path, params, working_dir, 1
                    )
                    
                    if result > 32:
                        return {"status": "success", "message": "Launched as Admin"}
                    else:
                        return {"error": f"Admin launch failed (Code {result})"}
                else:
                    # Standard Launch (Detached Process)
                    DETACHED_PROCESS = 0x00000008
                    cmd = [normalized_path] + args_list
                    
                    subprocess.Popen(
                        cmd,
                        cwd=working_dir,
                        creationflags=DETACHED_PROCESS,
                        close_fds=True,
                        shell=False
                    )

            # --- MacOS Execution ---
            elif sys.platform == "darwin":
                if normalized_path.endswith(".app"):
                    cmd = ["open", "-a", normalized_path]
                    if args_list:
                        cmd.append("--args")
                        cmd.extend(args_list)
                    subprocess.Popen(cmd)
                else:
                    subprocess.Popen(
                        [normalized_path] + args_list,
                        cwd=working_dir,
                        start_new_session=True
                    )

            # --- Linux Execution ---
            else:
                subprocess.Popen(
                    [normalized_path] + args_list,
                    cwd=working_dir,
                    start_new_session=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )

            filename = os.path.basename(normalized_path)
            return {"status": "success", "executed": filename}

        except Exception as e:
            return {"error": str(e)}

# Register the instance
register(AppLauncherPlugin())