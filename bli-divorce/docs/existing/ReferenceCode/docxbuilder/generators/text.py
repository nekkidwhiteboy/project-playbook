from typing import Any, Dict, Set
from pathlib import Path

from docxbuilder.jinja import DEFAULT_JINJA_ENV, meta

from . import BaseGenerator, File


class TextGenerator(BaseGenerator):
    """Generator for generic text-based files (i.e. .txt, .html, etc.)."""

    jinja_env = DEFAULT_JINJA_ENV

    def __call__(
        self, template: File, context: Dict[str, Any], output_path: str | Path
    ) -> Path:
        save_path = self.output_dir / output_path
        tpl = self.jinja_env.from_string(template.read().decode())
        with open(save_path, "w") as out_file:
            out_file.write(tpl.render(context))

        return save_path

    def get_used_fields(self, template: File) -> Set[str]:
        parsed = self.jinja_env.parse(template.read().decode())
        return meta.find_undeclared_variables(parsed)
