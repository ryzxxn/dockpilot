from abc import ABC, abstractmethod
from typing import Any, Dict


class ButtonPlugin(ABC):
    """
    Base class for all button plugins.
    """

    type: str  # unique identifier, e.g. "trigger_api"

    @abstractmethod
    def validate_config(self, config: Dict[str, Any]) -> None:
        """Raise ValueError if config is invalid"""
        pass

    @abstractmethod
    def schema(self) -> Dict[str, Any]:
        """Return frontend-editable schema"""
        pass

    @abstractmethod
    def execute(self, config: Dict[str, Any]) -> Any:
        """Execute the button action"""
        pass
