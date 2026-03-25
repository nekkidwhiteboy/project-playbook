import json
import os
from datetime import datetime
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from django.db.models import Q
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.response import Response

from accounts.models import User, UserEvent
from accounts.permissions import IsAdminRole, IsAdminRoleOrReadonly, IsStaffRole
from dynamic_forms.models import DynamicForm, DynamicFormResult

from .models import Template, TemplateSet, VisibleTo
from .permissions import CanGenerateDocs
from .serializers import (
    TemplateSerializer,
    TemplateInfoSerializer,
    TemplateSetDetailSerializer,
    TemplateSetSerializer,
)


class TemplateViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    filter_backends = [SearchFilter]
    search_fields = ["name"]

    @property
    def pagination_class(self):
        page_size = self.request.query_params.get(
            super().pagination_class.page_size_query_param, "auto"
        )
        if page_size == "auto":
            return None
        return super().pagination_class

    def get_queryset(self):
        if self.request.user.role == User.Role.Owner:
            return Template.objects.all()

        return Template.objects.filter(
            Q(owner=self.request.user) | Q(visible_to=VisibleTo.Anyone)
        )

    def get_serializer_class(self):
        view = self.request.query_params.get("view")
        if self.action == "list" and view != "detail":
            return TemplateInfoSerializer
        return TemplateSerializer

    def create(self, request):
        if type(request.data["extra_fields"]) is list:
            extra_fields = request.data["extra_fields"]
        else:
            extra_fields = json.loads(request.data["extra_fields"])

        template = Template.objects.create(
            file=request.FILES.get("file"),
            name=request.data["name"],
            output_filename=request.data["output_filename"],
            visible_to=request.data["visible_to"],
            owner=request.user,
            extra_fields=extra_fields,
        )

        serializer = self.get_serializer(template)

        return Response(serializer.data, status=201)

    @action(detail=True, permission_classes=[IsAdminRole])
    def url(self, request, *args, **kwargs):
        expires_in = request.query_params.get("expires_in", 300)
        return Response(
            {
                "url": self.get_object().get_presigned_url(expires_in=expires_in),
                "expires_in": expires_in,
            }
        )

    @action(detail=True, permission_classes=[IsAdminRole])
    def used_fields(self, request, *args, **kwargs):
        return Response({"used_fields": self.get_object().get_used_fields()})


class TemplateSetViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRoleOrReadonly]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    search_fields = ["name"]
    filterset_fields = ["form"]

    @property
    def pagination_class(self):
        page_size = self.request.query_params.get(
            super().pagination_class.page_size_query_param, "auto"
        )
        if page_size == "auto":
            return None
        return super().pagination_class

    def get_queryset(self):
        return TemplateSet.objects.filter(
            Q(owner=self.request.user) | Q(visible_to=VisibleTo.Anyone)
        )

    def get_serializer_class(self):
        if (
            self.request.method == "GET"
            and self.request.query_params.get("detail", "").lower() == "true"
        ):
            return TemplateSetDetailSerializer
        return TemplateSetSerializer

    def create(self, request):
        form = DynamicForm.objects.get(pk=request.data["form"])

        try:
            template_set = TemplateSet.objects.create(
                form=form,
                name=request.data["name"],
                owner=request.user,
                visible_to=request.data["visible_to"],
                template_data=request.data["templates"],
            )
        except Template.DoesNotExist:
            return Response(
                {
                    "detail": "One or more templates could not be added to the set"
                    " because they do not exist or you do not have"
                    " permission to access to them."
                },
                status=400,
            )

        serializer = self.get_serializer(template_set)
        return Response(serializer.data, status=201)

    @action(
        detail=True, methods=["post"], permission_classes=[IsStaffRole, CanGenerateDocs]
    )
    def generate(self, request, pk=None):
        try:
            result_id = request.data["result_id"]
            result = DynamicFormResult.objects.get(pk=result_id)
        except (KeyError, DynamicFormResult.DoesNotExist):
            return Response({"detail": "Missing or invalid result_id."}, status=400)

        extra_data = request.data.get("extra_data", {})
        meta_data = {
            "_meta_": {
                "form": {"name": result.form.name},
                "result": {
                    "date_finish": result.date_finish,
                    "date_start": result.date_start,
                    "date_update": result.date_update,
                    "id": result.id,
                },
                "request": {"user": request.user.email, "timestamp": datetime.now()},
            }
        }

        template_set: TemplateSet = self.get_object()

        out_dir = Path("./temp").resolve() / str(request.user.id)
        out_dir.mkdir(exist_ok=True, parents=True)

        response = HttpResponse(content_type="application/zip")
        archive = ZipFile(response, "w", ZIP_DEFLATED)
        try:
            for file in template_set.generate(
                result.items | meta_data, out_dir, **extra_data
            ):
                archive.write(file, arcname=file.name)
                os.remove(file)
        except Exception as error:
            return Response({"detail": str(error)}, status=500)
        response["Content-Disposition"] = (
            f"attachment; filename={template_set.name}.zip"
        )

        UserEvent.objects.create(
            type="GENERATE_DOCS",
            source=request.user,
            target=result.owner,
            description="User generated documents from template set",
            detail={"template_set": template_set.id, "result": result.id, **extra_data},
        )

        return response

    @action(detail=True, methods=["get"])
    def templates(self, *args, **kwargs):
        return Response(TemplateSerializer(self.get_object().templates, many=True).data)
