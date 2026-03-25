import json
from itertools import zip_longest
from pathlib import Path

from dynamic_forms.serializers import DynamicFormInfoSerializer
from rest_framework.serializers import ModelSerializer, SerializerMethodField

from .models import Template, TemplateSet, TemplateRule


class TemplateSerializer(ModelSerializer):
    file_name = SerializerMethodField()

    class Meta:
        model = Template
        fields = "__all__"
        read_only_fields = ["owner"]
        extra_kwargs = {"file": {"write_only": True}}

    def update(self, instance, validated_data):
        if "file" in validated_data:
            instance.file.delete(save=False)

        if (
            "extra_fields" in validated_data
            and type(validated_data["extra_fields"]) is str
        ):
            validated_data["extra_fields"] = json.loads(validated_data["extra_fields"])

        return super().update(instance, validated_data)

    def get_file_name(self, obj):
        return Path(obj.file.name).name


class TemplateInfoSerializer(ModelSerializer):
    class Meta:
        model = Template
        fields = ["id", "name"]
        read_only_fields = ["name"]


class TemplateRuleSerializer(ModelSerializer):
    class Meta:
        model = TemplateRule
        fields = ["template", "rule"]


class TemplateRuleDetailSerializer(ModelSerializer):
    class Meta:
        model = TemplateRule
        fields = ["template", "rule"]

    template = TemplateSerializer(read_only=True)


class TemplateSetSerializer(ModelSerializer):
    class Meta:
        model = TemplateSet
        fields = ["form", "name", "id", "owner", "visible_to", "templates", "rules"]
        read_only_fields = ["owner", "form"]

    templates = TemplateRuleSerializer(source="template_rules", many=True)

    def update(self, instance, validated_data):
        instance.name = validated_data.get("name", instance.name)
        instance.owner = validated_data.get("owner", instance.owner)
        instance.visible_to = validated_data.get("visible_to", instance.visible_to)
        instance.rules = validated_data.get("rules", instance.rules)
        instance.save()

        if "template_rules" in validated_data:
            template_data = validated_data.pop("template_rules")
            for curr, new in zip_longest(instance.template_rules.all(), template_data):
                if curr is None:
                    instance.add_template(new)
                elif new is None:
                    curr.delete()
                else:
                    curr.template = new["template"]
                    curr.rule = new.get("rule")
                    curr.save()

        return instance


class TemplateSetDetailSerializer(ModelSerializer):
    class Meta:
        model = TemplateSet
        fields = "__all__"
        read_only_fields = ["owner"]

    templates = TemplateRuleDetailSerializer(source="template_rules", many=True)
    form = DynamicFormInfoSerializer(read_only=True)
