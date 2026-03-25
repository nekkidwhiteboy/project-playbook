"""Contains test functions for the Jinja Environment"""

from .filters import _try_parse_date


def after(date1, date2):
    """Returns True if date1 is after date2."""
    d1 = _try_parse_date(date1)
    d2 = _try_parse_date(date2)

    if d1 is None or d2 is None:
        return False

    return d1 > d2


def before(date1, date2):
    """Returns True if date1 is before date2."""
    d1 = _try_parse_date(date1)
    d2 = _try_parse_date(date2)

    if d1 is None or d2 is None:
        return False

    return d1 < d2


def partially_empty(items, prop):
    """Checks if any of the values of prop in items are an empty string.

    :param items: A list of dictionaries that all contain the property `prop`.

    :param prop: The property on `items` that should be checked.
    """
    for item in items:
        if item[prop] == "":
            return True
    return False
