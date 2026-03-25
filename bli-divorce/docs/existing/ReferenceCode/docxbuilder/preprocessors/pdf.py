from typing import Any, Dict

from pypdf import PdfReader

from . import BasePreprocessor, File


class FillablePdfPreprocessor(BasePreprocessor):

    def __call__(self, context: Dict[str, Any], template: File) -> Dict[str, Any]:
        reader = PdfReader(template)
        pdf_context = self._get_pdf_context(context, reader)

        return pdf_context

    def _get_pdf_context(self, context: dict[str, any], reader: PdfReader):
        pdf_context = {}

        for key, val in context.items():
            if key == "_meta_":
                pdf_context["_meta_"] = val
            elif type(val) == dict:
                for k, v in self._get_pdf_context(val, reader).items():
                    pdf_context[f"{key}.{k}"] = v
            elif type(val) == list:
                for i in range(len(val)):
                    for k, v in self._get_pdf_context(val[i], reader).items():
                        pdf_context[f"{key}.{i}.{k}"] = v
            elif callable(val):
                continue
            else:
                pdf_context[key] = val

        fields = reader.get_fields()
        for key, val in pdf_context.items():
            if field := fields.get(key):
                if field.field_type == "/Btn":
                    # Radio/Checkbox values must start with a "/" in order to be filled
                    pdf_context[key] = f"/{val}"

        return pdf_context
