# plugin/registry.py
from typing import Dict, List, Any, Optional # Added Optional
from .base import ButtonPlugin

class PluginRegistry:
    def __init__(self):
        self._plugins: Dict[str, ButtonPlugin] = {}

    def register(self, plugin: ButtonPlugin):
        print(f"✅ Registering plugin: {plugin.type}")
        self._plugins[plugin.type] = plugin

    # Change hint to Optional[ButtonPlugin] because it might return None
    def get_plugin(self, plugin_type: str) -> Optional[ButtonPlugin]:
        return self._plugins.get(plugin_type)

    def list_types(self) -> List[str]:
        return list(self._plugins.keys())

    def list_types_with_schemas(self) -> List[Dict[str, Any]]:
        return [
            {"type": p.type, "schema": p.get_schema()} 
            for p in self._plugins.values()
        ]

# Create the singleton instance
registry = PluginRegistry()

# Export the register function
register = registry.register