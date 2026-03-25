import logging
import urllib
from json import loads
from os import getenv

from django.views.decorators.cache import never_cache
from django.views.generic import TemplateView
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import BaseParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

logger = logging.getLogger(__name__)


index = never_cache(TemplateView.as_view(template_name="index.html"))

dsn_whitelist = [getenv("REACT_APP_SENTRY_DSN"), getenv("SENTRY_DSN")]


class TextParser(BaseParser):
    media_type = "text/plain"

    def parse(self, stream, media_type=None, parser_context=None):
        return stream.read()


@api_view(["POST"])
@permission_classes([AllowAny])
@parser_classes([TextParser])
def sentry(request):
    try:
        envelope = request.data
        header = loads(envelope.split(b"\n")[0].decode("utf-8"))
        dsn = urllib.parse.urlparse(header.get("dsn"))
        project_id = dsn.path.strip("/")

        if dsn.geturl() not in dsn_whitelist:
            return Response("Invalid Sentry DSN", status=400)

        request = urllib.request.Request(
            f"https://{dsn.hostname}/api/{project_id}/envelope/",
            data=envelope,
        )
        request.add_header("Content-Type", "application/x-sentry-envelope")

        urllib.request.urlopen(request)
    except Exception as e:
        logger.error(e)
        return Response(status=400)

    return Response(status=204)
