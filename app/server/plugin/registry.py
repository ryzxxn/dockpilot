from typing import Dict
from plugin.base import ButtonPlugin

# Global registry
_REGISTRY: Dict[str, ButtonPlugin] = {}


def register(plugin: ButtonPlugin) -> None:
    """Register a plugin in the global registry."""
    if plugin.type in _REGISTRY:
        raise RuntimeError(f"Button already registered: {plugin.type}")
    _REGISTRY[plugin.type] = plugin


def get(type_: str) -> ButtonPlugin:
    """Retrieve a registered plugin by its type."""
    if type_ not in _REGISTRY:
        raise KeyError(f"Unknown button type: {type_}")
    return _REGISTRY[type_]


def list_types() -> list[str]:
    """Return a list of all registered plugin types."""
    return list(_REGISTRY.keys())
