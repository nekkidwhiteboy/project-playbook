from rest_framework import viewsets
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend

from accounts.permissions import IsAdminRole

from .models import Webhook
from .serializers import WebhookSerializer


class Webhooks(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    queryset = Webhook.objects.all().order_by("pk")
    serializer_class = WebhookSerializer
    filter_backends = [SearchFilter, DjangoFilterBackend]
    filterset_fields = ["active"]
    search_fields = ["name"]
