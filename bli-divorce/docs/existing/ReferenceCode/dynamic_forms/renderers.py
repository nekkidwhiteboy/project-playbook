from rest_framework.renderers import BaseRenderer


class PDFRenderer(BaseRenderer):
    media_type = "application/pdf"
    format = "pdf"
    charset = "ISO-8859-2"
    render_style = "binary"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data
