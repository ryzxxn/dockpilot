# plugin/loadplugin.py
import os
import importlib
import sys

def load_plugins():
    # Get the absolute path to the 'plugin' directory
    plugin_dir = os.path.dirname(__file__)
    
    print(f"🔍 Searching for plugins in: {plugin_dir}")

    # Iterate through all items in the plugin folder
    for item in os.listdir(plugin_dir):
        item_path = os.path.join(plugin_dir, item)
        
        # We only care about directories (like trigger_api, discord)
        if os.path.isdir(item_path):
            # Check if main.py exists in that directory
            main_file = os.path.join(item_path, "main.py")
            if os.path.exists(main_file):
                # Construct the module path (e.g., plugin.trigger_api.main)
                module_name = f"plugin.{item}.main"
                try:
                    print(f"🔌 Loading plugin: {module_name}")
                    importlib.import_module(module_name)
                except Exception as e:
                    print(f"❌ Failed to load plugin {module_name}: {e}")
            else:
                # Useful for debugging why a folder wasn't loaded
                if not item.startswith("__"):
                    print(f"⚠️ Folder '{item}' has no main.py, skipping.")