# plugin/base.py
from typing import Any, Dict, List
from abc import ABC, abstractmethod

class ButtonPlugin(ABC):
    @property
    @abstractmethod
    def type(self) -> str:
        pass

    @abstractmethod
    def get_schema(self) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def validate_config(self, config: Dict[str, Any]) -> None:
        pass

    @abstractmethod
    def execute(self, config: Dict[str, Any]) -> Any:
        pass