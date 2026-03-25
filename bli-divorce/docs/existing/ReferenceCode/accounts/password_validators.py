import re
from django.core.exceptions import ValidationError


# Based on: https://medium.com/geekculture/django-shorts-password-validators-95285c0936de

class NumberValidator:
    def __init__(self, min_count=1):
        self.min_count = min_count

    def validate(self, password, user=None):
        if len(re.findall('\d', password)) < self.min_count:
            raise ValidationError(
                f"The password must contain at least {self.min_count} digit(s), 0-9.",
                code='password_no_number',
            )

    def get_help_text(self):
        return "Your password must contain at least 1 digit, 0-9."


class UppercaseValidator:
    def __init__(self, min_count=1):
        self.min_count = min_count

    def validate(self, password, user=None):
        if len(re.findall('[A-Z]', password)) < self.min_count:
            raise ValidationError(
                f"The password must contain at least {self.min_count} uppercase letter(s), A-Z.",
                code='password_no_upper',
            )

    def get_help_text(self):
        return f"Your password must contain at least {self.min_count} uppercase letter(s), A-Z."


class LowercaseValidator(object):
    def __init__(self, min_count=1):
        self.min_count = min_count

    def validate(self, password, user=None):
        if len(re.findall('[a-z]', password)) < self.min_count:
            raise ValidationError(
                f"The password must contain at least {self.min_count} lowercase letter(s), a-z.",
                code='password_no_lower',
            )

    def get_help_text(self):
        return f"Your password must contain at least {self.min_count} lowercase letter(s), a-z."


class SymbolValidator(object):
    def __init__(self, min_count=1):
        self.min_count = min_count

    def validate(self, password, user=None):
        if len(re.findall('[()[\]{}|\\`~!@#$%^&*_\-+=;:\'",<>./?]', password)) < self.min_count:
            raise ValidationError(
                f"The password must contain at least {self.min_count} special character(s): "
                "()[]{}|`~!@#$%^&*_-+=;:'\",<>./?",
                code='password_no_symbol',
            )

    def get_help_text(self):
        return (
            f"Your password must contain at least {self.min_count} special character(s): "
            "()[]{}|`~!@#$%^&*_-+=;:'&quote;,<>./?"
        )
