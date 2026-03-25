from pathlib import Path
from typing import Any, Dict, Set

from django.core.files import File
from docxtpl import DocxTemplate, InlineImage
from docx.shared import Inches

from docxbuilder.ptsimg import create_image
from docxbuilder.jinja import DEFAULT_JINJA_ENV
from . import BaseGenerator


class DocxGenerator(BaseGenerator):
    jinja_env = DEFAULT_JINJA_ENV

    def __call__(
        self, template: File, context: Dict[str, Any], output_path: Path | str
    ) -> Path:
        save_path = self.output_dir / output_path

        tpl = DocxTemplate(template)

        pts_img_file = self.output_dir / "pts_img.png"

        self.jinja_env.filters["pts_img"] = self._get_image_creator(tpl, pts_img_file)

        tpl.render(context, jinja_env=self.jinja_env)
        tpl.save(save_path)

        if pts_img_file.exists():
            pts_img_file.unlink()

        return save_path

    def _get_image_creator(self, template, img_name):
        def pts_img(
            periods,
            pet_color="#FF6666",
            resp_color="#6666FF",
            pet_name="Petitioner",
            resp_name="Respondent",
            width=10.0,
            num_weeks="auto",
            default_time="12:00",
        ):
            try:
                create_image(
                    img_name,
                    periods,
                    pet_color=pet_color,
                    resp_color=resp_color,
                    pet_name=pet_name,
                    resp_name=resp_name,
                    num_weeks=num_weeks,
                    default_time=default_time,
                )
                return InlineImage(template, str(img_name), width=Inches(width))
            except Exception as e:
                return "ERROR: Unable to generate PTS Image."

        return pts_img

    def get_used_fields(self, template: File) -> Set[str]:
        return DocxTemplate(template).get_undeclared_template_variables(self.jinja_env)
