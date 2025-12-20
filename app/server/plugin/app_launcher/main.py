import os
import subprocess
import shlex
import sys
from typing import Any, Dict, List
from plugin.base import ButtonPlugin
from plugin.registry import register

# Import config schema
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

    def _resolve_windows_shortcut(self, shortcut_path: str):
        """
        Reads a Windows .lnk file using pywin32. 
        Only works on Windows.
        """
        if sys.platform != "win32":
            return None, None, None

        try:
            # Local import to prevent errors on Mac/Linux
            import pythoncom 
            import win32com.client
            
            # Initialize COM for this thread
            pythoncom.CoInitialize()
            
            shell = win32com.client.Dispatch("WScript.Shell")
            shortcut = shell.CreateShortCut(shortcut_path)
            
            target = shortcut.Targetpath
            args = shortcut.Arguments
            cwd = shortcut.WorkingDirectory
            
            return target, args, cwd
        except ImportError:
            print("❌ pywin32 is not installed. Cannot parse .lnk files.")
            return None, None, None
        except Exception as e:
            print(f"❌ Error resolving shortcut: {e}")
            return None, None, None
        finally:
            if 'pythoncom' in sys.modules:
                pythoncom.CoUninitialize()

    def _resolve_linux_desktop_file(self, file_path: str):
        """
        Parses a Linux .desktop file (standard for Linux shortcuts/PWAs).
        Extracts the 'Exec' line.
        """
        try:
            target_cmd = None
            cwd = None
            
            with open(file_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    # Look for Exec=
                    if line.startswith("Exec=") and not target_cmd:
                        # Extract command, remove field codes like %U or %F often found in .desktop
                        raw_cmd = line[5:]
                        # Remove common placeholders
                        raw_cmd = raw_cmd.replace("%U", "").replace("%F", "").replace("%u", "").strip()
                        target_cmd = raw_cmd
                    
                    # Look for Path= (Working Directory)
                    if line.startswith("Path="):
                        cwd = line[5:].strip()
            
            if target_cmd:
                # Split command into [exe, arg1, arg2...]
                parts = shlex.split(target_cmd)
                return parts[0], shlex.join(parts[1:]), cwd
                
            return None, None, None
        except Exception as e:
            print(f"Error parsing .desktop file: {e}")
            return None, None, None

    def execute(self, config: Dict[str, Any]) -> Any:
        app_path = config.get("app_path", "")
        extra_arguments = config.get("arguments", "")
        run_as_admin = config.get("run_as_admin", "No")

        # 1. Expand User Paths (~/...)
        normalized_path = os.path.expanduser(app_path)
        normalized_path = os.path.normpath(normalized_path)

        if not os.path.exists(normalized_path):
            return {"error": f"File not found: {normalized_path}"}

        # 2. Defaults
        target_exe = normalized_path
        final_args_list = []
        working_dir = os.path.dirname(normalized_path)

        # ---------------------------------------------------------
        # PLATFORM SPECIFIC RESOLUTION
        # ---------------------------------------------------------
        
        # --- WINDOWS SHORTCUTS (.lnk) ---
        if sys.platform == "win32" and normalized_path.lower().endswith(".lnk"):
            res_target, res_args, res_cwd = self._resolve_windows_shortcut(normalized_path)
            if res_target:
                target_exe = res_target
                if res_args: final_args_list.extend(shlex.split(res_args))
                if res_cwd: working_dir = res_cwd
                else: working_dir = os.path.dirname(target_exe)

        # --- LINUX SHORTCUTS (.desktop) ---
        elif sys.platform == "linux" and normalized_path.lower().endswith(".desktop"):
            res_target, res_args, res_cwd = self._resolve_linux_desktop_file(normalized_path)
            if res_target:
                target_exe = res_target
                if res_args: final_args_list.extend(shlex.split(res_args))
                if res_cwd: working_dir = res_cwd

        # --- MAC OS BUNDLES (.app) ---
        # Note: Mac PWAs are usually independent .app bundles in ~/Applications/Chrome Apps/
        # We don't resolve them to the binary; we use 'open -a' which is safer on Mac.
        
        # ---------------------------------------------------------
        # MERGE USER CONFIG ARGUMENTS
        # ---------------------------------------------------------
        if extra_arguments:
            try:
                final_args_list.extend(shlex.split(extra_arguments))
            except Exception:
                pass

        try:
            # -----------------------------------------------------
            # EXECUTION
            # -----------------------------------------------------

            # === WINDOWS ===
            if sys.platform == "win32":
                params_str = shlex.join(final_args_list) if final_args_list else ""

                if run_as_admin == "Yes":
                    import ctypes
                    result = ctypes.windll.shell32.ShellExecuteW(
                        None, "runas", target_exe, params_str, working_dir, 1
                    )
                    if result > 32: return {"status": "success", "message": "Launched (Admin)"}
                    else: return {"error": f"Admin launch failed (Code {result})"}
                else:
                    DETACHED_PROCESS = 0x00000008
                    cmd = [target_exe] + final_args_list
                    subprocess.Popen(cmd, cwd=working_dir, creationflags=DETACHED_PROCESS, close_fds=True, shell=False)

            # === MACOS ===
            elif sys.platform == "darwin":
                # If it's a .app bundle (Standard Apps & Chrome PWAs on Mac)
                if target_exe.endswith(".app"):
                    cmd = ["open", "-a", target_exe]
                    if final_args_list:
                        cmd.append("--args")
                        cmd.extend(final_args_list)
                    subprocess.Popen(cmd)
                else:
                    # Raw Binary
                    cmd = [target_exe] + final_args_list
                    subprocess.Popen(cmd, cwd=working_dir, start_new_session=True)

            # === LINUX ===
            else:
                cmd = [target_exe] + final_args_list
                subprocess.Popen(cmd, cwd=working_dir, start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

            filename = os.path.basename(target_exe)
            return {"status": "success", "executed": filename}

        except Exception as e:
            return {"error": str(e)}

register(AppLauncherPlugin())