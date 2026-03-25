import logging
from datetime import datetime, time
from functools import cache
from itertools import chain
from re import sub

import phonenumbers
from dictdiffer import diff
from django.contrib.postgres.fields import ArrayField, HStoreField
from django.core.mail import EmailMessage
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models.fields import IntegerField
from django.db.models.fields.json import JSONField
from django.db.models.fields.related import ForeignKey
from django.dispatch import receiver
from django.template import Context, Template

from accounts.models import User
from accounts.signals import user_registered
from docxbuilder.ptsimg import FONT_DIR

from . import util
from .eval_context import all_rules_pass, evaluate, replace_pipes
from .interval import ParentingPeriod
from .pdf import PDF

logger = logging.getLogger(__name__)


class DynamicForm(models.Model):
    class Meta:
        ordering = ["pk"]

    name = models.CharField(max_length=30)
    description = models.CharField(max_length=120)
    slug = models.SlugField(unique=True, max_length=50)
    max_results_per_client = models.IntegerField(
        null=True, default=0, validators=[MinValueValidator(0)]
    )
    max_results_per_staff = models.IntegerField(
        null=True, default=0, validators=[MinValueValidator(0)]
    )
    root_page = models.OneToOneField(
        "DynamicFormPage",
        on_delete=models.RESTRICT,
        related_name="+",
    )

    def __str__(self) -> str:
        return f"name='{self.name}'"

    def get_cleaned_items(self, items):
        cleaned_items = {}
        page = self.pages.first()
        while page is not None:
            cleaned_items |= page.get_cleaned_items(cleaned_items | items)
            page = util.get_next_page(page.next.all(), cleaned_items)

        return cleaned_items


class EmailSubmitAction(models.Model):
    name = models.CharField(max_length=50)
    active = models.BooleanField(default=False)
    rules = ArrayField(models.CharField(max_length=50), default=list)
    run_on_resubmit = models.BooleanField(default=False)
    parent_form = ForeignKey(
        DynamicForm, on_delete=models.CASCADE, related_name="email_actions"
    )

    subject = models.CharField(max_length=100, blank=True)
    body = models.TextField(max_length=10_000, blank=True)
    from_name = models.CharField(max_length=50, blank=True)
    from_addr = models.EmailField()
    to = ArrayField(models.CharField(max_length=100), default=list)
    to_bcc = ArrayField(models.CharField(max_length=100), default=list)
    to_cc = ArrayField(models.CharField(max_length=100), default=list)
    reply_to = ArrayField(models.CharField(max_length=100), default=list)
    include_result = models.BooleanField(default=False)

    def run(self, result: "DynamicFormResult"):
        if not self.active:
            return

        if all_rules_pass(self.rules, result.items):
            data = {
                "meta": {
                    "User": {"email": result.owner.email},
                    "Form": {
                        "name": result.form.name,
                        "description": result.form.description,
                    },
                    "Id": result.id,
                },
                **result.items,
            }
            try:
                subject = Template(self.subject or "No Subject")
                body = Template(
                    f"""
                        {{% extends 'email/base.html' %}}
                        {{% block title %}}{self.subject}{{% endblock title%}}
                        {{% block content %}}{self.body}{{% endblock content %}}
                    """
                )
                email = EmailMessage(
                    subject=subject.render(Context(data)),
                    body=body.render(Context(data)),
                    from_email=self.get_from_addr(),
                    to=[replace_pipes(e, data) for e in self.to],
                    bcc=[replace_pipes(e, data) for e in self.to_bcc],
                    reply_to=self.reply_to,
                    cc=[replace_pipes(e, data) for e in self.to_cc],
                )
                email.content_subtype = "html"

                if self.include_result:
                    email.attach(
                        f"{result.form.name}_{result.pk}.pdf",
                        result.generate_pdf(dest="S"),
                        "application/pdf",
                    )

                email.send()
            except Exception as err:
                logger.error("Unable to send email!")
                logger.error(err)

    def get_from_addr(self):
        if self.from_name != "":
            return f"{self.from_name} <{self.from_addr}>"
        return self.from_addr


class NewResultSubmitAction(models.Model):
    name = models.CharField(max_length=50)
    active = models.BooleanField(default=False)
    rules = ArrayField(models.CharField(max_length=50), default=list)
    run_on_resubmit = models.BooleanField(default=False)
    parent_form = ForeignKey(
        DynamicForm, on_delete=models.CASCADE, related_name="new_result_actions"
    )

    new_result_form = ForeignKey(DynamicForm, on_delete=models.CASCADE)
    item_map = HStoreField(default=dict)

    def run(self, result: "DynamicFormResult"):
        if not self.active:
            return

        if all_rules_pass(self.rules, result.items):
            try:
                items = {}
                if self.item_map is not None:
                    for key, val in self.item_map.items():
                        try:
                            items[key] = evaluate(val, result.items)
                        except:
                            pass
                new_result = DynamicFormResult(
                    form=self.new_result_form, owner=result.owner, items=items
                )
                new_result.save()
            except Exception as err:
                logger.error("Unable to run NewResultSubmitAction!")
                logger.error(err)


class DynamicFormPage(models.Model):

    title = models.CharField(max_length=50)
    rows = JSONField()

    parent_form = ForeignKey(
        DynamicForm, on_delete=models.CASCADE, related_name="pages"
    )

    def __str__(self) -> str:
        return f"title='{self.title}'"

    def get_cleaned_items(self, items):
        _items = {}
        for row in self.rows:
            _items |= self._clean_row(row, items | _items)

        return _items

    def _clean_row(self, row, items, index=0):
        row_values = {}
        _context = items | {"_index": index}

        # check if row is MultiItem
        if isinstance(row, dict):
            multiItemValues = []
            if all_rules_pass(row["rules"], _context):
                for i in range(len(util.getIn(items, row["name"], []))):
                    cleaned_item = {}
                    for sub_row in row["rows"]:
                        cleaned_item |= self._clean_row(sub_row, items, index=i)

                    multiItemValues.append(cleaned_item)

            row_values[row["name"]] = multiItemValues
        else:
            for item in row:
                if item["type"] != "HTML":
                    if all_rules_pass(item["rules"], _context):
                        val = util.getIn(
                            items, replace_pipes(item["name"], {"_index": index})
                        )
                        if item["type"] == "NUMBER" and val is not None:
                            if item.get("precision") == 0:
                                val = int(val)
                            elif item.get("precision", 0) > 0:
                                val = float(val)
                        elif item["type"] == "ADDRESS_BLOCK":
                            if val is None:
                                val = {
                                    "City": "",
                                    "Country": "",
                                    "State": "",
                                    "Street": "",
                                    "Line2": "",
                                    "PostalCode": "",
                                }
                            else:
                                val = {
                                    "City": val.get("City", ""),
                                    "Country": val.get("Country", ""),
                                    "State": val.get("State", ""),
                                    "Street": val.get("Street", ""),
                                    "Line2": val.get("Line2", ""),
                                    "PostalCode": val.get("PostalCode", ""),
                                }

                        if (after := item.get("addonAfter")) and type(after) is dict:
                            row_values[_get_item_name(after["name"])] = util.getIn(
                                items,
                                replace_pipes(after["name"], {"_index": index}),
                            )

                        if (before := item.get("addonBefore")) and type(before) is dict:
                            row_values[_get_item_name(before["name"])] = util.getIn(
                                items, replace_pipes(before["name"], {"_index", index})
                            )

                    else:
                        val = None
                        # Clear the value in the context so that fields dependant
                        #  on this value also have their value cleared
                        _context = util.setIn(
                            _context,
                            replace_pipes(item["name"], {"_index": index}),
                            None,
                        )
                        if (after := item.get("addonAfter")) and type(after) is dict:
                            row_values[_get_item_name(after["name"])] = None
                            # Clear the value in the context so that fields dependant
                            #  on this value also have their value cleared
                            _context = util.setIn(
                                _context,
                                replace_pipes(after["name"], {"_index": index}),
                                None,
                            )

                        if (before := item.get("addonBefore")) and type(before) is dict:
                            row_values[_get_item_name(before["name"])] = None
                            # Clear the value in the context so that fields dependant
                            #  on this value also have their value cleared
                            _context = util.setIn(
                                _context,
                                replace_pipes(before["name"], {"_index": index}),
                                None,
                            )

                    row_values[_get_item_name(item["name"])] = val

        return util.strip_recursive(row_values)

    def get_default_items(self):
        items = {}
        for row in self.rows:
            if type(row) is dict:
                items[row["name"]] = []
            else:
                for item in row:
                    if item["type"] != "HTML":
                        items[item["name"]] = None
        return items


@cache
def _get_item_name(full_name):
    return sub(r"^\w+\.{{\$index}}\.", "", full_name)


class DynamicFormSuccessPage(models.Model):
    class Meta:
        ordering = ["-priority"]

    title = models.CharField(max_length=50)
    rows = JSONField()
    link = models.URLField(null=True)

    priority = IntegerField(default=0)
    rules = ArrayField(models.CharField(max_length=50))

    parent_form = ForeignKey(
        DynamicForm, on_delete=models.CASCADE, related_name="success_pages", null=True
    )


class NextRules(models.Model):
    class Meta:
        ordering = ["-priority"]

    rules = ArrayField(models.CharField(max_length=50))
    priority = IntegerField(default=0)
    page = ForeignKey(DynamicFormPage, on_delete=models.CASCADE, null=True)

    parent_page = ForeignKey(
        DynamicFormPage, on_delete=models.CASCADE, related_name="next"
    )

    def __str__(self) -> str:
        return f"page='{self.page.pk}' rules={self.rules}"


class DynamicFormResult(models.Model):
    class ResultStatus(models.TextChoices):
        NotStarted = "Not Started", "Not Started"
        InProgress = "In Progress", "In Progress"
        Complete = "Complete", "Complete"
        Failed = "Failed", "Failed"
        Locked = "Locked", "Locked"

    form = ForeignKey(
        DynamicForm, null=True, on_delete=models.SET_NULL, related_name="results"
    )
    owner = ForeignKey(User, on_delete=models.CASCADE, related_name="results")

    user_agent = models.TextField(null=True)
    user_ip = models.GenericIPAddressField(null=True)

    date_finish = models.DateTimeField(blank=True, null=True)
    date_start = models.DateTimeField(auto_now_add=True)
    date_update = models.DateTimeField(auto_now=True)

    result_status = models.CharField(
        choices=ResultStatus.choices, default=ResultStatus.NotStarted, max_length=15
    )

    items = JSONField()

    current_version = models.ForeignKey(
        "ResultVersion", on_delete=models.SET_NULL, null=True, default=None
    )

    def __str__(self) -> str:
        return f"id={self.pk} owner={self.owner} result_status={self.result_status}"

    def reset(self):
        self.date_finish = None
        self.result_status = self.ResultStatus.NotStarted
        self.items = {}

    def clean(self):
        self.items = self.form.get_cleaned_items(self.items)

    def key_val_pairs(self):
        context = self.items | {"_meta": {"date_start": self.date_start}}
        pairs = []
        for page in util.iter_pages(self.form.root_page, context):
            for items in [row for row in page.rows]:
                if type(items) is dict:
                    if not all_rules_pass(items["rules"], context):
                        continue
                    values = []
                    for _index in range(len(context.get(items["name"]))):
                        v = []
                        for sub_item in chain.from_iterable(items["rows"]):
                            if sub_item["type"] == "HTML" or not all_rules_pass(
                                sub_item["rules"], {"_index": _index} | context
                            ):
                                continue

                            addon_after = None
                            if sub_item.get("addonAfter"):
                                if type(sub_item["addonAfter"]) == str:
                                    addon_after = replace_pipes(
                                        sub_item["addonAfter"],
                                        {"_index": _index} | context,
                                    )
                                else:
                                    addon_after = sub_item["addonAfter"] | {
                                        "name": replace_pipes(
                                            sub_item["addonAfter"]["name"],
                                            {"_index": _index},
                                        ),
                                    }

                            addon_before = None
                            if sub_item.get("addonBefore"):
                                if type(sub_item["addonBefore"]) == str:
                                    addon_before = replace_pipes(
                                        sub_item["addonBefore"],
                                        {"_index": _index} | context,
                                    )
                                else:
                                    addon_before = sub_item["addonBefore"] | {
                                        "name": replace_pipes(
                                            sub_item["addonBefore"]["name"],
                                            {"_index": _index},
                                        ),
                                    }

                            sub_label = replace_pipes(
                                sub_item["label"], {"_index": _index} | context
                            )
                            sub_value = self._get_display_value(
                                sub_item
                                | {
                                    "name": replace_pipes(
                                        sub_item["name"], {"_index": _index}
                                    ),
                                    "addonAfter": addon_after,
                                    "addonBefore": addon_before,
                                }
                            )
                            v.append((sub_label, sub_value))
                        values.append(tuple(v))
                    label = replace_pipes(items.get("label", ""), context)
                    pairs.append((label, tuple(values)))
                else:
                    for item in items:
                        if item["type"] == "HTML" or not all_rules_pass(
                            item["rules"], context
                        ):
                            continue
                        elif item["type"] == "PTS":
                            DAYS = (
                                "Monday",
                                "Tuesday",
                                "Wednesday",
                                "Thursday",
                                "Friday",
                                "Saturday",
                                "Sunday",
                            )
                            try:
                                # Works on Windows only
                                datetime.now().strftime("%#I:%M %p")
                                _format = "%#I:%M %p"
                            except ValueError:
                                try:
                                    # Works on Linux/OSX only
                                    datetime.now().strftime("%-I:%M %p")
                                    _format = "%-I:%M %p"
                                except ValueError:
                                    _format = "%I:%M %p"
                            label = replace_pipes(item["label"], context)
                            values = []
                            for period in util.getIn(context, item["name"], []):
                                p = ParentingPeriod(period)
                                values.append(
                                    (
                                        (
                                            "Start Day",
                                            f"Week {p.StartDay[0] + 1} {DAYS[p.StartDay[1]]}",
                                        ),
                                        (
                                            "Start Time",
                                            (
                                                time.fromisoformat(
                                                    p.StartTime
                                                ).strftime(_format)
                                                if p.StartTime
                                                else "N/A"
                                            ),
                                        ),
                                        (
                                            "End Day",
                                            f"Week {p.EndDay[0] + 1} {DAYS[p.EndDay[1]]}",
                                        ),
                                        (
                                            "Start Time",
                                            (
                                                time.fromisoformat(p.EndTime).strftime(
                                                    _format
                                                )
                                                if p.EndTime
                                                else "N/A"
                                            ),
                                        ),
                                    )
                                )

                            pairs.append((label, tuple(values)))

                        else:
                            label = replace_pipes(item["label"], context)
                            value = self._get_display_value(item)
                            pairs.append((label, value))
        return pairs

    def generate_pdf(self, include_meta=False, **kwargs):
        pdf = PDF()
        pdf.add_page()

        pdf.add_font("segoe-ui", style="", fname=FONT_DIR / "segoeui.ttf")
        pdf.add_font("segoe-ui", style="b", fname=FONT_DIR / "segoeuib.ttf")
        pdf.add_font("segoe-ui", style="i", fname=FONT_DIR / "segoeuii.ttf")

        # Add title
        pdf.set_font("segoe-ui", size=18)
        pdf.cell(0, None, self.form.name, align="C")
        pdf.ln()

        # Get item pairs
        pairs = [
            ("Result ID", str(self.pk)),
            ("Status", self.ResultStatus(self.result_status)),
        ] + self.key_val_pairs()
        if include_meta:
            pairs += [
                ("Start Time", self.date_start.strftime("%m/%d/%Y %H:%M:%S")),
                (
                    "Finish Time",
                    (
                        self.date_finish.strftime("%m/%d/%Y %H:%M:%S")
                        if self.date_finish
                        else "N/A"
                    ),
                ),
                ("Last Update", self.date_update.strftime("%m/%d/%Y %H:%M:%S")),
                ("User IP", str(self.user_ip)),
            ]

        # Draw table
        pdf.set_font_size(14)
        pdf.table(pairs)

        return pdf.output(**kwargs)

    def _get_display_value(self, item):
        value = util.getIn(self.items, item["name"])

        if value is None:
            return ""

        if "format" in item:
            if isinstance(item["format"], list):
                value = [
                    datetime.fromisoformat(value).strftime(
                        util.convert_format(item["format"][i])
                    )
                    for i, val in enumerate(value)
                ]
            else:
                value = datetime.fromisoformat(value).strftime(
                    util.convert_format(item["format"])
                )

        if item["type"] == "NUMBER":
            precision = item.get("precision", 0)
            value = item.get("prefix", "") + f"{value:.{precision}f}"
        elif item["type"] == "PHONE_NUMBER":
            value = phonenumbers.format_number(
                phonenumbers.parse(value, None), phonenumbers.PhoneNumberFormat.NATIONAL
            )
        elif item["type"] == "SELECT" or item["type"] == "RADIO":
            for option in util.expand_option_presets(item["options"], self.items):
                if isinstance(option, dict):
                    if (
                        not isinstance(option["value"], str)
                        and value == option["value"]
                    ) or (
                        isinstance(option["value"], str)
                        and value == replace_pipes(option["value"], self.items)
                    ):
                        value = replace_pipes(option["label"], self.items)
                        break
                elif isinstance(option, str) and value == replace_pipes(
                    option, self.items
                ):
                    break
        elif item["type"] == "CHECKBOX":
            _values = set(value)
            _options = [
                opt if isinstance(opt, dict) else {"label": opt, "value": opt}
                for opt in util.expand_option_presets(item["options"], self.items)
            ]
            value = "\n".join(
                opt["value"] for opt in _options if opt["value"] in _values
            )
        elif item["type"] == "SWITCH":
            if item.get("unCheckedChildren") and not value:
                value = item["unCheckedChildren"]
            elif item.get("checkedChildren") and value:
                value = item["checkedChildren"]
            elif item.get("innerLabel") and value:
                value = item["innerLabel"]
            elif item.get("innerLabel") and not value:
                value = ""
        elif item["type"] == "ADDRESS_BLOCK":
            if value.get("Street"):
                return (
                    f"{value.get('Street')}{f', {l}' if (l := value.get('Line2')) else ''}\n"
                    f"{value.get('City')}, {value.get('State')} {value.get('PostalCode')}\n"
                    f"{value.get('Country')}"
                )
        elif item["type"] == "TIME":
            prefix = util.get_datetime_prefix()
            if len(value) == 8:
                value = datetime.strptime(value, "%H:%M:%S").strftime(
                    f"%{prefix}H:%M:%S %p"
                )
            else:
                value = datetime.strptime(value, "%H:%M").strftime(f"%{prefix}H:%M %p")

        if item.get("addonAfter"):
            if type(item["addonAfter"]) == str:
                value = f"{value} {replace_pipes(item['addonAfter'], self.items)}"
            else:
                value = f"{value} {self._get_display_value(item['addonAfter'])}"

        if item.get("addonBefore"):
            if type(item["addonBefore"]) == str:
                value = f"{value} {replace_pipes(item['addonBefore'], self.items)}"
            else:
                value = f"{value} {self._get_display_value(item['addonBefore'])}"

        return ", ".join(value) if isinstance(value, list) else str(value)

    def create_version(self, current=True, **kwargs):
        kwargs.setdefault("created_by", self.owner)
        kwargs.setdefault("items", self.items)
        version = self.versions.create(result=self, **kwargs)

        if current:
            self.current_version = version
            self.save()

        return version


class ResultVersion(models.Model):
    class Meta:
        ordering = ["-created_date"]

    created_date = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True)

    description = models.TextField(default="Automatic")
    items = JSONField()
    result = models.ForeignKey(
        DynamicFormResult, on_delete=models.CASCADE, related_name="versions"
    )

    def diff(self, other: "ResultVersion"):
        if type(self) is not type(other):
            raise TypeError(f"Param 'other' must be of type '{type(self)}'")
        if self.result.form != other.result.form:
            raise ValueError("Cannot diff results from different forms!")

        return list(diff(self.items, other.items, expand=True))

    def __sub__(self, other):
        return self.diff(other)

    def __str__(self) -> str:
        return f"id={self.pk} description={self.description} result={self.result.pk}"

    @classmethod
    def from_result(cls, result: DynamicFormResult, **kwargs):
        kwargs.setdefault("created_by", result.owner)
        kwargs.setdefault("items", result.items)
        return cls(
            result=result,
            **kwargs,
        )


DEFAULT_FORM_PK = 1


@receiver(user_registered, sender=User)
def create_initial_result(sender, user=None, **kwargs):
    form = DynamicForm.objects.get(pk=DEFAULT_FORM_PK)
    DynamicFormResult.objects.create(form=form, owner=user, items={})


def get_form_labels(form: DynamicForm):
    for page in form.pages.all():
        yield f"[PAGE '{page.title}']"
        for row in page.rows:
            if type(row) is list:
                for item in row:
                    yield item.get("label", item.get("content", "[No Content]"))
            elif type(row) is dict:
                for _row in row["rows"]:
                    for item in _row:
                        yield item.get("label", item.get("content", "[No Content]"))
