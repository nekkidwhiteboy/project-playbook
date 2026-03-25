from importlib import import_module
from pathlib import Path
from typing import Any, Dict, Generator

import boto3
from botocore.exceptions import ClientError
from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models import Q
from django.db.models.fields.json import JSONField

from accounts.models import User
from backend.validators import JSONSchemaValidator
from dynamic_forms.eval_context import evaluate, replace_pipes
from dynamic_forms.models import DynamicForm

from .generators import BaseGenerator
from .preprocessors import BasePreprocessor
from .schemas import EXTRA_FIELDS_SCHEMA
from .storage_backends import TemplateStorage
from .util import replace_deep


def user_dir_path(instance, filename):
    return f"users/{instance.owner.id}/{filename}"


class VisibleTo(models.TextChoices):
    Anyone = "Anyone", "Anyone"
    Owner = "Owner", "Just Me"


class Template(models.Model):
    class Meta:
        ordering = ["id"]

    name = models.CharField(max_length=200)
    output_filename = models.CharField(max_length=200)
    file = models.FileField(upload_to=user_dir_path, storage=TemplateStorage())

    generator = models.CharField(max_length=50, default="AUTO")
    preprocessor = models.CharField(max_length=50, default="NONE")

    extra_fields = JSONField(
        default=list,
        blank=True,
        validators=[JSONSchemaValidator(limit_value=EXTRA_FIELDS_SCHEMA)],
    )

    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    visible_to = models.CharField(
        choices=VisibleTo.choices, default=VisibleTo.Owner, max_length=6
    )

    def __str__(self):
        return f"pk={self.pk} name='{self.name}'"

    def generate(self, data, out_dir: Path, jinja_env=None, **extra) -> Path:
        try:
            save_path = out_dir / self.get_name(data)
            context = self.get_context(data, extra)
            generate = self.get_generator(out_dir, jinja_env)

            return generate(self.file, context, save_path)
        except Exception as error:
            raise Exception(f"(#{self.pk}) {self.name}: {error}") from error

    def get_context(
        self, data: Dict[str, Any], extra: Dict[str, Any] = {}
    ) -> Dict[str, Any]:
        extra_fields = self.get_default_extra_fields() | extra

        context = replace_deep(data | extra_fields, None, "")

        preprocess = self.get_preprocessor()

        return preprocess(context, self.file)

    def get_generator(self, output_dir=None, jinja_env=None) -> BaseGenerator:
        if self.generator == "AUTO":
            file_type = Path(self.file.name).suffix
            if file_type == ".docx":
                module_name, class_name = "docx", "DocxGenerator"
            elif file_type == ".pdf":
                module_name, class_name = "pdf", "PdfFiller"
            else:
                module_name, class_name = "text", "TextGenerator"
        else:
            module_name, class_name = self.generator.split("::")

        module = import_module(f"docxbuilder.generators.{module_name}")
        generator = getattr(module, class_name)
        if not issubclass(generator, BaseGenerator):
            raise ValueError("Invalid Generator")

        return generator(output_dir, jinja_env)

    def get_preprocessor(self) -> BasePreprocessor:
        if self.preprocessor == "NONE":
            return BasePreprocessor()

        module_name, class_name = self.preprocessor.split("::")
        module = import_module(f"docxbuilder.preprocessors.{module_name}")
        preprocessor = getattr(module, class_name)

        if not issubclass(preprocessor, BasePreprocessor):
            raise ValueError("Invalid Preprocessor")

        return preprocessor()

    def get_default_extra_fields(self):
        return {
            f["name"]: (
                f["value"] if type(f["value"]) is not list else f["value"][0]["value"]
            )
            for f in self.extra_fields
        }

    def get_name(self, data):
        path = Path(self.file.name)
        name = replace_pipes(self.output_filename, {**data, "filename": path.name})
        return name if name.endswith(path.suffix) else name + path.suffix

    def save(self, clean=True, **kwargs):
        if clean:
            self.clean_fields()  # Make sure fields get validated
        return super().save(**kwargs)

    def get_presigned_url(self, expires_in=600):
        s3_client = boto3.session.Session(
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name="us-east-2",
        ).client("s3")
        try:
            return s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
                    "Key": f"{TemplateStorage.location}/{self.file.name}",
                },
                ExpiresIn=expires_in,
            )
        except ClientError as e:
            print(e)
            return None

    def get_used_fields(self):
        return self.get_generator().get_used_fields(self.file)


class TemplateRule(models.Model):
    template = models.ForeignKey(
        Template, on_delete=models.CASCADE, related_name="rules"
    )
    template_set = models.ForeignKey(
        "TemplateSet", on_delete=models.CASCADE, related_name="template_rules"
    )
    rule = models.CharField(max_length=256, blank=True)


class TemplateSetManager(models.Manager):
    def create(
        self,
        form,
        name,
        owner,
        visible_to=VisibleTo.Owner,
        template_data=[],
        raise_exceptions=True,
    ):
        template_set = TemplateSet(
            form=form, name=name, owner=owner, visible_to=visible_to
        )
        template_set.save()

        for data in template_data:
            try:
                template_set.add_template(data)
            except Template.DoesNotExist as e:
                if not raise_exceptions:
                    continue
                template_set.delete()
                raise e from None

        return template_set


class TemplateSet(models.Model):
    class Meta:
        ordering = ["id"]
        permissions = [
            ("generate_docs", "Can generate documents using this TemplateSet")
        ]

    form = models.ForeignKey(
        DynamicForm, related_name="template_sets", on_delete=models.SET_NULL, null=True
    )
    name = models.CharField(max_length=50)

    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    visible_to = models.CharField(
        choices=VisibleTo.choices, default=VisibleTo.Owner, max_length=6
    )
    rules = ArrayField(models.CharField(max_length=100), default=list)

    objects = TemplateSetManager()

    @property
    def templates(self):
        return [tr.template for tr in self.template_rules.all()]

    def generate(self, data, out_dir, **kwargs) -> Generator[Path, None, None]:
        for template_rule in self.template_rules.all():
            if template_rule.rule == "" or evaluate(template_rule.rule, data):
                yield template_rule.template.generate(data, out_dir, **kwargs)

    def add_template(self, template_data):
        if isinstance(template_data, TemplateRule):
            self.template_rules.add(template_data)
        else:
            template_qs = Template.objects.filter(
                Q(owner=self.owner) | Q(visible_to=VisibleTo.Anyone)
            )
            if isinstance(template_data, Template):
                template = template_qs.get(pk=template_data.pk)
                rule = ""
            elif isinstance(template_data, int):
                template = template_qs.get(pk=template_data)
                rule = ""
            elif (_temp := template_data.get("template")) is not None:
                if isinstance(_temp, Template):
                    template = template_qs.get(pk=_temp.id)
                else:
                    template = template_qs.get(pk=_temp)
                rule = template_data.get("rule", "")
            else:
                template = None

            if template is not None:
                TemplateRule.objects.create(
                    template_set=self, template=template, rule=rule
                )
