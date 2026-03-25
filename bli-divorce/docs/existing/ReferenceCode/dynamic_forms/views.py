import logging
from itertools import chain
from re import split
from urllib.parse import unquote

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import (
    DjangoFilterBackend,
    FilterSet,
    CharFilter,
    BaseInFilter,
)
from rest_framework import generics, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import ValidationError

import docxbuilder.serializers
from accounts.models import User
from accounts.permissions import IsAdminRole, IsStaffRole
from dynamic_forms.eval_context import all_rules_pass

from . import serializers
from .models import (
    DynamicForm,
    DynamicFormPage,
    DynamicFormResult,
    DynamicFormSuccessPage,
    EmailSubmitAction,
    NewResultSubmitAction,
    NextRules,
    ResultVersion,
)
from .permissions import CanCreateResult
from .renderers import PDFRenderer
from .util import get_next_page, calc_percentage
from .validation import validate_page, validate_result
from .signals import result_submitted

logger = logging.getLogger(__name__)


class DynamicFormListView(generics.ListAPIView):
    """Retrieves a list of all DynamicForms."""

    permission_classes = [IsStaffRole]
    queryset = DynamicForm.objects.all()

    def get_serializer_class(self):
        view = self.request.query_params.get("view", "detail")
        if view == "info":
            return serializers.DynamicFormInfoSerializer
        return serializers.DynamicFormSerializer


class MultipleFieldLookupMixin(object):
    def get_object(self):
        queryset = self.get_queryset()
        queryset = self.filter_queryset(queryset)
        filter = {}
        for field in self.lookup_fields:
            if self.kwargs.get(field, None):
                filter[field] = self.kwargs[field]
        obj = get_object_or_404(queryset, **filter)  # Lookup the object
        self.check_object_permissions(self.request, obj)
        return obj


class DynamicFormView(MultipleFieldLookupMixin, generics.RetrieveUpdateAPIView):
    """Retrieves a single form's schema."""

    queryset = DynamicForm.objects.all()
    lookup_fields = ("pk", "slug")

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH"):
            return [IsAdminRole()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        view = self.request.query_params.get("view", "default")

        match view:
            case "schema":
                return serializers.DynamicFormSchemaSerializer
            case "info":
                return serializers.DynamicFormInfoSerializer
            case _:
                return serializers.DynamicFormSerializer


class DynamicFormTemplateSets(generics.ListAPIView):
    serializer_class = docxbuilder.serializers.TemplateSetDetailSerializer
    permission_classes = [IsStaffRole]

    def get_queryset(self):
        return DynamicForm.objects.get(pk=self.kwargs.get("pk")).template_sets.all()


class EmailActionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminRole]
    serializer_class = serializers.EmailActionSerializer
    filter_backends = [SearchFilter, DjangoFilterBackend]
    filterset_fields = ["active", "parent_form"]
    search_fields = ["name"]

    def get_queryset(self):
        return EmailSubmitAction.objects.order_by("-pk")


class NewResultSubmitActionViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.NewResultActionSerializer
    permission_classes = [IsAdminRole]
    filter_backends = [SearchFilter, DjangoFilterBackend]
    filterset_fields = ["active", "parent_form"]
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
        return NewResultSubmitAction.objects.order_by("-pk")


class DynamicFormPageListView(generics.ListAPIView):
    """Returns a list of all the page schemas a user can access.

    Can be filtered by a parent_form.
    """

    serializer_class = serializers.DynamicFormPageSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["parent_form"]

    def get_queryset(self):
        if self.request.user.role >= User.Role.Staff:
            return DynamicFormPage.objects.all()

        forms = DynamicFormResult.objects.filter(owner=self.request.user).values("form")
        return DynamicFormPage.objects.filter(parent_form__in=forms)


class DynamicFormPageView(generics.RetrieveAPIView):
    """Retrieves a single page's schema."""

    serializer_class = serializers.DynamicFormPageSerializer
    queryset = DynamicFormPage.objects.all()


class DynamicFormSuccessPageView(generics.RetrieveAPIView):
    """Retrieves a single success page's schema."""

    serializer_class = serializers.DynamicFormSuccessPageSerializer
    queryset = DynamicFormSuccessPage.objects.all()


@api_view(["POST"])
def next_page_view(request, pk=None):
    items = request.data["items"]
    page_rules = NextRules.objects.filter(parent_page__pk=pk).all()

    next_page = get_next_page(page_rules, items)

    if next_page is not None:
        return Response({"next": next_page.pk}, 200)

    return Response({"next": None}, 200)


class ResultSearchFilter(SearchFilter):
    def get_search_fields(self, view, request):
        query = unquote(request.query_params.get(self.search_param, ""))
        if query.startswith("?"):
            field, type, *_ = split(r"([=^@])?=", query[1:])
            return [f"{type or ''}items__{field}"]
        return super().get_search_fields(view, request)

    def get_search_terms(self, request):
        query = unquote(request.query_params.get(self.search_param, ""))
        if query.startswith("?"):
            _, _, *val = split(r"([=^@])?=", query[1:])
            return "".join(val)
        return super().get_search_terms(request)


class ResultFilter(FilterSet):
    class CharInFilter(BaseInFilter, CharFilter):
        pass

    result_status = CharInFilter()

    class Meta:
        model = DynamicFormResult
        fields = ["owner", "form", "result_status", "id"]


class ResultViewSet(viewsets.ModelViewSet):
    filter_backends = [ResultSearchFilter, DjangoFilterBackend]
    filterset_class = ResultFilter
    search_fields = ["owner__first_name", "owner__last_name", "owner__email"]

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), CanCreateResult()]

        if self.action == "destroy":
            return [IsAdminRole()]

        return super().get_permissions()

    def get_queryset(self):
        if self.request.user.role >= User.Role.Staff:
            return DynamicFormResult.objects.order_by("-pk")

        return DynamicFormResult.objects.filter(owner=self.request.user).order_by("-pk")

    def get_serializer_class(self):
        if self.request.query_params.get("detail", "false").lower() == "true":
            return serializers.DynamicFormResultTableSerializer
        return serializers.FullDynamicFormResultSerializer

    def create(self, request, *args, **kwargs):

        try:
            if form_id := request.data.get("form"):
                form = DynamicForm.objects.get(pk=form_id)
            elif slug := request.data.get("slug"):
                form = DynamicForm.objects.get(slug=slug)
            else:
                return Response("Either form or slug is required", status=400)
        except DynamicForm.DoesNotExist:
            return Response("Invalid form or slug", status=400)

        userId = request.data.get("owner")
        if userId:
            user = User.objects.get(pk=userId)
        else:
            user = request.user

        result = DynamicFormResult(form=form, owner=user, items={})
        result.save()
        result.create_version(created_by=request.user, description="New Result")

        serializer = self.get_serializer(result)
        return Response(serializer.data, status=201)

    def update(self, request, *args, **kwargs):
        page_id = request.data.get("page")
        items = request.data.get("items", {})
        partial = request.data.get("partial", False)

        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0]
        else:
            ip = request.META.get("REMOTE_ADDR")

        instance: DynamicFormResult = self.get_object()

        if not _can_update_result(request.user, instance):
            raise PermissionDenied("You do not have permission to edit this result.")

        instance.user_ip = ip
        instance.user_agent = request.META.get("HTTP_USER_AGENT")

        if page_id is not None:
            page = instance.form.pages.get(pk=page_id)
            instance.items.update(page.get_cleaned_items(instance.items | items))
            is_valid, errors, _ = validate_page(
                instance.items | {"_meta_": {"date_start": instance.date_start}},
                page,
                allow_extra=True,
                partial=partial,
            )

            if not is_valid:
                raise ValidationError(
                    {"detail": "Unable to update result.", "errors": errors}, code=400
                )
        else:
            instance.items = instance.form.get_cleaned_items(items)

        if (
            result_status := request.data.get("result_status")
        ) and request.user.role >= User.Role.Admin:
            # Only an Admin+ can manually update a result's result_status
            instance.result_status = result_status
        elif instance.result_status == DynamicFormResult.ResultStatus.NotStarted:
            # Set the result_status to InProgress, the first time the result is updated
            instance.result_status = DynamicFormResult.ResultStatus.InProgress

        instance.save()

        if page is not None:
            message = f"{'Update' if partial else 'Submit'} Page '{page.title}'"
        else:
            message = "Update Result"

        version = ResultVersion.from_result(
            instance, created_by=request.user, description=message
        )

        if instance.current_version is None or (
            instance.current_version - version != []
        ):
            version.save()
            instance.current_version = version
            instance.save()

        if self.request.user.role >= User.Role.Staff:
            serializer = serializers.FullDynamicFormResultSerializer(instance)
        else:
            serializer = serializers.BasicDynamicFormResultSerializer(instance)

        return Response(serializer.data)

    def retrieve(self, request, **kwargs):
        instance = self.get_object()
        page_id = request.GET.get("page", None)
        version = request.query_params.get("version")

        if version is not None:
            try:
                instance.items = instance.versions.get(pk=version).items
            except ResultVersion.DoesNotExist:
                pass

        try:
            page_id = int(page_id)
        except (ValueError, TypeError):
            page_id = None

        # No ?page= query was provided, return the whole result
        if page_id is None:
            return Response(self.get_serializer(instance).data)

        try:
            rows = instance.form.pages.get(pk=page_id).rows
        except DynamicFormPage.DoesNotExist:
            rows = []

        # Get only items from the queried page
        page_items = {}

        for row in rows:
            if type(row) is dict:  # row is a MultiItem
                val = instance.items.get(row["name"], None)

                if val is None:
                    # Initialize the MultiItem, since it is not yet in the result.
                    page_items[row["name"]] = []

                    if row.get("source"):
                        continue

                    # Fill the MultiItem with initial values.
                    for _ in range(0, max(row["initialItems"], row["minItems"], 0)):
                        list_item = {}
                        for item in chain(*row["rows"]):
                            if item["type"] != "HTML":
                                # Get the list item's name without the prefix.
                                name = item["name"].split(".")[-1]
                                # Set the list item's initial value, if one was provided.
                                init_val = (
                                    None
                                    if item["type"] != "ADDRESS_BLOCK"
                                    else {
                                        "City": None,
                                        "Country": item.get("defaultCountry"),
                                        "Line2": None,
                                        "PostalCode": None,
                                        "State": None,
                                        "Street": None,
                                    }
                                )
                                list_item[name] = item.get("initialValue", init_val)

                                addon_after = item.get("addonAfter")
                                if type(addon_after) == dict:
                                    name = addon_after["name"].split(".")[-1]
                                    list_item[name] = addon_after.get("initialValue")

                                addon_before = item.get("addonBefore")
                                if type(addon_before) == dict:
                                    name = addon_before["name"].split(".")[-1]
                                    list_item[name] = addon_before.get("initialValue")

                        page_items[row["name"]].append(list_item)
                else:
                    # Use MultiItem's value from the result.
                    page_items[row["name"]] = val

            else:  # row is NOT a MultiItem
                for item in row:
                    if item["type"] != "HTML":
                        # Get the value of the item from the result.
                        # If it is not yet in the result, try to get its initialValue.
                        # If there is no initialValue, default to None.
                        init_val = (
                            None
                            if item["type"] != "ADDRESS_BLOCK"
                            else {
                                "City": None,
                                "Country": item.get("defaultCountry"),
                                "Line2": None,
                                "PostalCode": None,
                                "State": None,
                                "Street": None,
                            }
                        )
                        page_items[item["name"]] = instance.items.get(
                            item["name"], item.get("initialValue", init_val)
                        )

                        addon_after = item.get("addonAfter")
                        if type(addon_after) == dict:
                            page_items[addon_after["name"]] = addon_after.get(
                                "initialValue"
                            )

                        addon_before = item.get("addonBefore")
                        if type(addon_before) == dict:
                            page_items[addon_before["name"]] = addon_before.get(
                                "initialValue"
                            )

        # DO NOT CALL .save() ON instance
        instance.percentage = calc_percentage(instance, page_id)
        instance.items = page_items
        instance.page_id = page_id

        serializer = serializers.FullDynamicFormResultSerializer(instance)

        return Response(serializer.data)

    @action(
        detail=True,
        methods=["GET"],
        permission_classes=[IsStaffRole],
        renderer_classes=[PDFRenderer],
    )
    def pdf(self, request, **kwargs):
        instance = self.get_object()
        return Response(
            instance.generate_pdf(include_meta=True).decode("ISO-8859-2"),
            content_type="application/pdf",
            headers={
                "Content-Disposition": f'filename="{instance.form.name}_{instance.id}.pdf"',
            },
        )

    @action(detail=True, methods=["POST"])
    def reset(self, request, *args, **kwargs):
        result = self.get_object()
        if (
            request.user.role < User.Role.Admin
            and result.owner != request.user
            and result.result_status != DynamicFormResult.ResultStatus.InProgress
        ):
            raise PermissionDenied

        if (v := request.query_params.get("version")) is not None:
            version = result.versions.get(pk=v)
            result.items = version.items
            result.current_version = version
        else:
            result.reset()
            result.create_version(created_by=request.user, description="Result Reset")

        result.save()
        return Response(status=204)

    @action(detail=True, methods=["POST"])
    def submit(self, *args, **kwargs):
        instance = self.get_object()

        if instance.result_status == DynamicFormResult.ResultStatus.InProgress:
            instance.clean()
            is_valid, errors, _ = validate_result(instance)
            if not is_valid:
                raise ValidationError(
                    {"detail": "Unable to submit result.", "errors": errors}, code=400
                )

            is_resubmit = instance.date_finish is not None

            instance.result_status = DynamicFormResult.ResultStatus.Complete
            instance.date_finish = timezone.now()
            instance.save()

            self._run_submit_actions(instance, is_resubmit)
            result_submitted.send(
                sender=DynamicFormResult, result=instance, is_resubmit=is_resubmit
            )

        if instance.result_status == DynamicFormResult.ResultStatus.Complete:
            success_pages = instance.form.success_pages.all()

            for page in success_pages:
                if all_rules_pass(page.rules, instance.items):
                    serializer = serializers.DynamicFormSuccessPageSerializer(page)
                    return Response(serializer.data)

            return Response({"detail": "Unable to find success page"}, status=500)

        else:
            return Response({"detail": "Unable to submit result"}, status=400)

    def _run_submit_actions(self, result: DynamicFormResult, is_resubmit):
        for action in chain(
            result.form.email_actions.all(), result.form.new_result_actions.all()
        ):
            if is_resubmit and not action.run_on_resubmit:
                continue
            action.run(result)


def _can_update_result(user: User, result: DynamicFormResult):
    # Admin can alway update results
    if user.role >= User.Role.Admin:
        return True

    # If the user is not an Admin...
    # The result can only be updated by the owner...
    if user == result.owner:
        # ...If it is NotStarted/InProgress
        if (
            result.result_status == DynamicFormResult.ResultStatus.NotStarted
            or result.result_status == DynamicFormResult.ResultStatus.InProgress
        ):
            return True

    # No one else can update the result
    return False
