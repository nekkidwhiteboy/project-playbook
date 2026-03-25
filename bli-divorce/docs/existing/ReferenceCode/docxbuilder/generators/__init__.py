from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, Set

from django.core.files import File
from jinja2 import Environment


class BaseGenerator(ABC):
    output_dir: Path = Path()
    jinja_env: Environment = Environment()

    def __init__(self, output_dir=None, jinja_env=None) -> None:
        super().__init__()

        if output_dir:
            self.output_dir = Path(output_dir)

        if jinja_env and isinstance(jinja_env, Environment):
            self.jinja_env = jinja_env

        self.output_dir.mkdir(exist_ok=True, parents=True)

    @abstractmethod
    def __call__(
        self, template: File, context: Dict[str, Any], output_path: Path | str
    ) -> Path:
        raise NotImplementedError()

    @abstractmethod
    def get_used_fields(self, template: File) -> Set[str]:
        raise NotImplementedError()
