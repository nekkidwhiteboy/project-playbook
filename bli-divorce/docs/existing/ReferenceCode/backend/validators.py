import jsonschema
from django.core import exceptions, validators

# Source: https://stackoverflow.com/a/49036841


class JSONSchemaValidator(validators.BaseValidator):
    def compare(self, value, schema):
        try:
            jsonschema.validate(value, schema)
        except jsonschema.exceptions.ValidationError:
            raise exceptions.ValidationError(
                f"{value} failed JSON schema check"
            )
