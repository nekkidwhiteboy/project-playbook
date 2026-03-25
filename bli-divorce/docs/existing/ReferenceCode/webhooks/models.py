import logging

import requests
from django.db import models
from django.db.models.fields.json import JSONField
from django.dispatch import receiver

from dynamic_forms.models import DynamicFormResult
from dynamic_forms.serializers import FullDynamicFormResultSerializer
from dynamic_forms.signals import result_submitted

logger = logging.getLogger(__name__)


# Create your models here.
class Webhook(models.Model):
    class Event(models.TextChoices):
        NewResultSubmission = "NEW_RESULT_SUBMISSION", "New Result Submission"

    active = models.BooleanField(default=False)
    event = models.TextField(choices=Event.choices)
    hook_url = models.URLField()
    params = JSONField()
    name = models.TextField(max_length=100)

    def call(self, data={}):
        if self.active:
            try:
                return requests.post(
                    self.hook_url,
                    json=data,
                )
            except requests.exceptions.RequestException as e:
                logger.error(e)
                return e.response

    def __str__(self) -> str:
        return f"id={self.pk} name={self.name}"


@receiver(result_submitted, sender=DynamicFormResult)
def on_dynamic_form_result_submitted(
    sender, result: DynamicFormResult = None, is_resubmit=False, **kwargs
):
    responses = []
    ok = True
    hooks = Webhook.objects.filter(event=Webhook.Event.NewResultSubmission, active=True)
    for hook in hooks:
        # Skip hook if any of:
        # - params.formId exists and does not match the submitted form
        # - is_resubmit == True and params.runOnResubmit != True

        formId = hook.params.get("formId")
        if (formId and formId != result.form.id) or (
            is_resubmit and not hook.params.get("runOnResubmit")
        ):
            logging.info(f"Running {hook}...SKIPPED")
            continue

        res = hook.call(FullDynamicFormResultSerializer(result).data)
        responses.append(res)
        if res.ok:
            logging.info(f"Running {hook}...OK")
        else:
            ok = False
            logging.info(f"Running {hook}...ERROR")

    return responses, ok
