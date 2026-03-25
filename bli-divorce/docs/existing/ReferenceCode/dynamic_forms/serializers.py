from rest_framework.serializers import (
    CharField,
    ListField,
    ModelSerializer,
    SerializerMethodField,
)

from accounts.serializers import UserSerializer

from .models import (
    DynamicForm,
    DynamicFormPage,
    DynamicFormResult,
    DynamicFormSuccessPage,
    EmailSubmitAction,
    NewResultSubmitAction,
    ResultVersion,
    NextRules,
)


class ResultVersionInfoSerializer(ModelSerializer):
    is_current = SerializerMethodField("get_is_current")

    class Meta:
        model = ResultVersion
        exclude = ["items"]
        read_only_fields = ["__all__"]

    def get_is_current(self, version):
        return version == version.result.current_version


class NextRulesSerializer(ModelSerializer):
    class Meta:
        model = NextRules
        fields = ("page", "rules")
        read_only_fields = ("page", "rules")


class DynamicFormPageSerializer(ModelSerializer):
    class Meta:
        model = DynamicFormPage
        fields = ("id", "title", "rows")


class DynamicFormPageSchemaSerializer(ModelSerializer):
    next = NextRulesSerializer(many=True)

    class Meta:
        model = DynamicFormPage
        fields = ("id", "next", "rows")
        read_only_fields = ("id", "next", "rows")


class DynamicFormSuccessPageSerializer(ModelSerializer):
    class Meta:
        model = DynamicFormSuccessPage
        fields = ("id", "title", "rows", "link")


class DynamicFormSerializer(ModelSerializer):
    class Meta:
        model = DynamicForm
        fields = (
            "id",
            "name",
            "description",
            "root_page",
            "template_sets",
            "slug",
            "max_results_per_client",
            "max_results_per_staff",
        )


class DynamicFormInfoSerializer(ModelSerializer):
    class Meta:
        model = DynamicForm
        fields = ("id", "name", "description")


class DynamicFormSchemaSerializer(ModelSerializer):
    pages = DynamicFormPageSchemaSerializer(many=True)

    class Meta:
        model = DynamicForm
        fields = ("id", "root_page", "pages")
        read_only_fields = ("id", "root_page", "pages")


class FullDynamicFormResultSerializer(ModelSerializer):
    form = DynamicFormInfoSerializer(read_only=True)
    versions = ResultVersionInfoSerializer(many=True, read_only=True)
    page_id = SerializerMethodField("get_page_id")
    percentage = SerializerMethodField("get_percentage")

    class Meta:
        model = DynamicFormResult
        fields = "__all__"
        read_only_fields = ["page_id"]

    def get_page_id(self, form_result):
        return getattr(form_result, "page_id", None)

    def get_percentage(self, form_result):
        return getattr(form_result, "percentage", 0)


class BasicDynamicFormResultSerializer(FullDynamicFormResultSerializer):
    """Excludes fields that a normal user should not be able to edit."""

    form = DynamicFormInfoSerializer(read_only=True)

    class Meta(FullDynamicFormResultSerializer.Meta):
        read_only_fields = (
            "user_agent",
            "user_ip",
            "date_finish",
            "date_start",
            "date_update",
            "result_status",
            "form",
            "owner",
        )


class DynamicFormResultTableSerializer(ModelSerializer):
    form = DynamicFormInfoSerializer(read_only=True)
    owner = UserSerializer(read_only=True)
    versions = ResultVersionInfoSerializer(many=True, read_only=True)

    class Meta:
        model = DynamicFormResult
        fields = "__all__"
        read_only_fields = ("id", "form", "owner", "result_status", "versions")


class EmailActionSerializer(ModelSerializer):
    rules = ListField(
        allow_empty=True, child=CharField(max_length=50, allow_blank=True)
    )
    to_bcc = ListField(
        allow_empty=True, child=CharField(max_length=50, allow_blank=True)
    )
    to_cc = ListField(
        allow_empty=True, child=CharField(max_length=50, allow_blank=True)
    )

    class Meta:
        model = EmailSubmitAction
        fields = "__all__"


class NewResultActionSerializer(ModelSerializer):
    rules = ListField(
        allow_empty=True, child=CharField(max_length=50, allow_blank=True)
    )

    class Meta:
        model = NewResultSubmitAction
        fields = "__all__"
