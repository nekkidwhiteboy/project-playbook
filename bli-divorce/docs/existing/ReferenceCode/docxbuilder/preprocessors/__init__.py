from abc import ABC
from typing import Any, Dict

from django.core.files import File


class BasePreprocessor(ABC):

    def __call__(self, context: Dict[str, Any], template: File) -> Dict[str, Any]:
        return context
