"""Contains filter functions for the Jinja Environment."""

from datetime import date, datetime
from dateutil.parser import parse, ParserError
from logging import error
from re import sub, findall

import inflect

_p = inflect.engine()


def concat(base, next_word):
    """Concatenates two strings if neither is empty"""
    if base != "" and base != None and next_word != "" and next_word != None:
        return str(base) + str(next_word)
    return ""


def a_an(next_word):
    """Prepends 'a' or 'an' to next_word, according to english rules."""
    return _p.a(next_word)


def _try_parse_date(d):
    """Try to parse the date in various formats.

    Date is parsed using dateutil.parser.parse:
    https://dateutil.readthedocs.io/en/stable/parser.html#dateutil.parser.parse
    """

    if type(d) == datetime:
        return d
    if type(d) == str:
        try:
            return parse(d)
        except (ValueError, ParserError):
            pass

    error(f"Unable to parse date: {str(d)}")
    return None


def age(dob):
    """Returns the number of years old the given date is."""

    dob = _try_parse_date(dob)
    if dob == None:
        return "<<ERROR parsing date: " + str(dob) + " >>"

    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def format_date(d, format="%B %d, %Y"):
    """Applies a format string to the given date.

    Details on how to format the date can be found at
    https://docs.python.org/3/library/datetime.html#strftime-and-strptime-format-codes
    """

    if d == "" or d is None:
        return ""

    d = _try_parse_date(d)
    if d is not None:
        return d.strftime(format)

    return "<<ERROR parsing date: " + str(d) + " >>"


def get_item(obj, key, default=""):
    try:
        return obj[key]
    except:
        return default


def initials(string, pattern=r"\w+", join=""):
    """Gets the first letter of each word."""
    words = findall(r"\w+", string)
    return join.join(word[0] for word in words)


def money(amount, prefix="$", postfix=""):
    """Formats a number as US currency."""
    if amount is None:
        return f"{prefix}0.00{postfix}"
    if type(amount) == str:
        return amount
    return f"{prefix}{amount:,.2f}{postfix}"


def pl(word, things):
    """Returns the plural version of word based on the number of things."""
    return _p.plural(word, len(things))


def percent(num, precision=2):
    """Returns a percentage string from a float."""
    return f"{num:.{precision}%}"


def phone(phone_num):
    numeric_str = sub("[^0-9]", "", phone_num)
    if phone_num.startswith("+1") and len(numeric_str) == 11:
        return f"{numeric_str[1:4]}-{numeric_str[4:7]}-{numeric_str[7:]}"
    if not phone_num.startswith("+") and len(numeric_str) == 10:
        return f"{numeric_str[:3]}-{numeric_str[3:6]}-{numeric_str[6:]}"
    else:
        return phone_num


def pick(sex, format):
    """Selects an option from format based on sex

    :param sex: 'Male' | 'Female' | 'Other'

    :param format: String in the format '[Male]|[Female]|[Other]' (e.g. 'Mr.|Mrs.|Mx.').
    """
    male, female, other = format.split("|")
    if sex == "Male":
        return male
    elif sex == "Female":
        return female
    else:
        return other


def substr(string, *args):
    return string[slice(*args)]


def words(number):
    """Returns a word representation of the given number"""
    return _p.number_to_words(number)
