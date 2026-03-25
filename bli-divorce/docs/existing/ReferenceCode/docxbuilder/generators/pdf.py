from pathlib import Path
from typing import Any, Dict, Set
from re import sub

from pypdf import PdfReader, PdfWriter

from docxbuilder.jinja import DEFAULT_JINJA_ENV, meta
from . import BaseGenerator, File


class PdfFiller(BaseGenerator):
    jinja_env = None

    def __call__(
        self, template: File, context: Dict[str, Any], output_path: Path | str
    ) -> Path:
        reader = PdfReader(template)
        writer = PdfWriter()

        writer.append(reader)

        for page in writer.pages:
            writer.update_page_form_field_values(
                page,
                context,
                auto_regenerate=True,
            )

        save_path = self.output_dir / output_path
        with open(save_path, "wb") as out_file:
            writer.write(out_file)

        return save_path

    def get_used_fields(self, template: File) -> Set[str]:
        return set(PdfReader(template).get_fields().keys())


class JinjaPdfFiller(PdfFiller):
    jinja_env = DEFAULT_JINJA_ENV

    def __init__(self, output_dir=None, jinja_env=None) -> None:
        super().__init__(output_dir, jinja_env)
        self.jinja_env.filters["btn"] = lambda v: f"/{v}"

    def __call__(
        self, template: File, context: Dict[str, Any], output_path: Path | str
    ) -> Path:
        reader = PdfReader(template)

        data = {}
        for key in reader.get_fields().keys():
            txt = sub(r"(?<!\\)->", r".", key)
            txt = sub(r"\\->", r"->", txt)

            tpl = self.jinja_env.from_string(txt)

            # Skip any fields that do not contain a jinja template
            if (rendered := tpl.render(context)) not in (key, txt):
                data[key] = rendered

        return super().__call__(template, data, output_path)

    def get_used_fields(self, template: File) -> Set[str]:
        reader = PdfReader(template)

        field_names = set()
        for key in reader.get_fields().keys():
            field_names.add(meta.find_undeclared_variables(self.jinja_env.parse(key)))

        return field_names
