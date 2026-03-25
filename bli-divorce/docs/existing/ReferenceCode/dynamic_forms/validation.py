import logging

from datetime import date, datetime, timedelta
from functools import reduce
from itertools import combinations
from math import inf
from re import fullmatch, sub as re_sub, findall as re_findall
from typing import Dict, List, Tuple

from dateutil.relativedelta import relativedelta

from .constants import COUNTRIES, STATES, PRESETS, US_TERRITORIES
from .eval_context import all_rules_pass, evaluate, replace_pipes
from .interval import CircInterval
from .models import DynamicFormPage, DynamicFormResult
from .util import get_next_page, expand_option_presets

logger = logging.getLogger(__name__)


def validate_result(
    result: DynamicFormResult, allow_extra=False
) -> Tuple[bool, List[Dict[str, any]], List[str]]:
    errors = []
    checked_fields = set()

    page = result.form.pages.first()
    while page is not None:
        _, _errors, _checked = validate_page(
            result.items | {"_meta_": {"date_start": result.date_start}},
            page,
            allow_extra=True,
        )
        errors += _errors
        checked_fields |= set(_checked)
        page = get_next_page(page.next.all(), result.items)

    if not allow_extra:
        for field in result.items:
            if field not in checked_fields:
                errors.append({"name": field, "error": "Extra fields not allowed."})

    return len(errors) == 0, errors, list(checked_fields)


def validate_page(
    data: Dict[str, any], page: DynamicFormPage, allow_extra=False, partial=False
) -> Tuple[bool, List[Dict[str, any]], List[str]]:
    errors = []
    checked_fields = set()

    for row in page.rows:
        _errors, _checked = _validate_row(row, data, partial=partial)
        errors += _errors
        checked_fields |= _checked

    if not allow_extra:
        for field in data:
            if field not in checked_fields:
                errors.append({"name": field, "error": "Extra fields not allowed."})

    return len(errors) == 0, errors, list(checked_fields)


def _validate_row(row, values, partial=False):
    errors = []
    checked_fields = set()

    if isinstance(row, dict):
        _errors = _validate_multi_item(row, values, partial=partial)
        if _errors:
            errors.append({"name": row["name"], "errors": _errors})
        checked_fields.add(row["name"])
    else:
        for item in row:
            if item["type"] == "HTML":
                continue

            error = _validate_item(item, values, ignore_required=partial)
            if error:
                errors.append(
                    {"name": replace_pipes(item["name"], values), "error": error}
                )

            checked_fields.add(item["name"])

            addon_after = item.get("addonAfter")
            if type(addon_after) == dict:
                error = _validate_item(addon_after, values, ignore_required=partial)
                if error:
                    errors.append(
                        {
                            "name": replace_pipes(addon_after["name"], values),
                            "error": error,
                        }
                    )
                checked_fields.add(addon_after["name"])

            addon_before = item.get("addonBefore")
            if type(addon_before) == dict:
                error = _validate_item(addon_before, values, ignore_required=partial)
                if error:
                    errors.append(
                        {
                            "name": replace_pipes(addon_before["name"], values),
                            "error": error,
                        }
                    )
                checked_fields.add(addon_before["name"])

    return errors, checked_fields


def _validate_item(item, values, ignore_required=False):
    item_name = item["name"].replace(".{{", "[").replace("}}", "]")

    try:
        value = evaluate(item_name, values)
    except (KeyError, AttributeError):
        return "Missing key."

    # Check if all rules pass
    if all_rules_pass(item["rules"], values):
        # Check all validators
        if _all_validators_pass(item["validators"], value, ignore_required):
            # If the item is optional & None, don't run other checks
            if value is None:
                return None

            # Extra checks, by item type
            match item["type"]:
                case "TEXT_SHORT" | "TEXT_LONG":
                    if item.get("maxLength", inf) < len(value):
                        return f"Value exceeds max length ({item['maxLength']})."

                case "NUMBER":
                    if item.get("max", inf) < value:
                        return f"Value exceeds max value ({item['max']})."
                    if item.get("min", -inf) > value:
                        return f"Value must be at least {item['min']}."

                    if item.get("precision", 0) == 0:
                        try:
                            int(value)
                        except ValueError:
                            return "Value must be an integer."
                    elif item.get("precision", 0) > 0:
                        try:
                            float(value)
                        except ValueError:
                            return "Value must be a float."

                case "RADIO":
                    options = [
                        (
                            replace_pipes(opt["value"], values)
                            if type(opt) is dict
                            else replace_pipes(opt, values)
                        )
                        for opt in item["options"]
                        if type(opt) is not dict
                        or all_rules_pass(opt.get("rules", []), values)
                    ]
                    if value not in options:
                        return f"Value must be one of {options}"

                case "DATE":
                    try:
                        if item.get("mode", "date") == "month":
                            v = datetime.strptime(value, "%Y-%m")
                            val = date(v.year, v.month, day=1)
                        else:
                            val = date.fromisoformat(value)
                    except ValueError:
                        return "Invalid date. Must be of format 'YYYY-MM-DD'."

                    if (_min := item.get("min")) is not None:
                        if _min.startswith("today"):
                            date_start = values["_meta_"]["date_start"].date()
                            _min = date_start + timedelta(days=int(_min[5:] or 0))
                        elif _min.startswith("current_month"):
                            date_start = values["_meta_"]["date_start"].date()
                            _min = date(
                                date_start.year, date_start.month, 1
                            ) + relativedelta(months=int(_min[13:] or 0))
                        else:
                            _min = date.fromisoformat(_min)

                        if val < _min:
                            return f"Invalid date. Value cannot come before {_min.isoformat()}"

                    if (_max := item.get("max")) is not None:
                        if _max.startswith("today"):
                            date_start = values["_meta_"]["date_start"].date()
                            _max = date_start + timedelta(days=int(_max[5:] or 0))
                        elif _max.startswith("current_month"):
                            date_start = values["_meta_"]["date_start"].date()
                            _max = date(
                                date_start.year, date_start.month, 1
                            ) + relativedelta(months=int(_max[13:] or 0))
                        else:
                            _max = date.fromisoformat(_max)

                        if val > _max:
                            return f"Invalid date. Value cannot come after {_max.isoformat()}"

                case "TIME":
                    try:
                        val = datetime.strptime(value, "%H:%M")
                    except:
                        return "Invalid time. Must be of format 'HH:mm'."

                    if (_min := item.get("min")) is not None:
                        _min = datetime.strptime(_min, "%H:%M")
                        if val < _min:
                            return f"Invalid time. Value cannot come before {_min.strftime('%H:%M')}"

                    if (_max := item.get("max")) is not None:
                        _max = datetime.strptime(_max, "%H:%M")
                        if val > _max:
                            return f"Invalid time. Value cannot come after {_max.strftime('%H:%M')}"

                case "SELECT":
                    options = [
                        (
                            replace_pipes(opt["value"], values)
                            if type(opt) is dict
                            else replace_pipes(opt, values)
                        )
                        for opt in expand_option_presets(item["options"], values)
                        if type(opt) is not dict
                        or all_rules_pass(opt.get("rules", []), values)
                    ]
                    if value not in options:
                        return f"Value must be one of {options}"

                case "CHECKBOX":
                    options = set(
                        (
                            replace_pipes(opt["value"], values)
                            if isinstance(opt, dict)
                            else replace_pipes(opt, values)
                        )
                        for opt in item["options"]
                    )
                    for opt in value:
                        if opt not in options:
                            return f"Invalid choice '{opt}'"

                case "SWITCH":
                    if type(value) != bool:
                        return "Value must be true/false"

                case "PHONE_NUMBER":
                    if not validators["PHONE_NUMBER"](value):
                        return "Invalid Phone Number"

                case "HIDDEN":
                    pass

                case "PTS":
                    if len(value) > item.get("maxPeriods", inf):
                        return "Too many items"
                    used_days = set()
                    intervals = []
                    for period in value:
                        try:
                            interval = CircInterval.from_dict(period)
                        except:
                            continue

                        if interval.start in used_days or interval.end in used_days:
                            return "Duplicate exchange time(s)."
                        intervals.append(interval)

                    for i1, i2 in combinations(intervals, 2):
                        if len(i1 & i2) > 0:
                            return "Overlapping intervals"

                case "ADDRESS_BLOCK":
                    city = value.get("City") or ""
                    country = value.get("Country") or ""
                    postal_code = value.get("PostalCode") or ""
                    state = value.get("State") or ""
                    street = value.get("Street") or ""
                    line_2 = value.get("Line2") or ""

                    if (
                        len(city) > item.get("cityProps", {}).get("maxLength", inf)
                        or len(country)
                        > item.get("countryProps", {}).get("maxLength", inf)
                        or len(postal_code)
                        > item.get("postalCodeProps", {}).get("maxLength", inf)
                        or len(state) > item.get("stateProps", {}).get("maxLength", inf)
                        or len(street)
                        > item.get("streetProps", {}).get("maxLength", inf)
                        or len(line_2)
                        > item.get("streetProps", {}).get("maxLength", inf)
                    ):
                        return f"Value exceeds max length ({item['maxLength']})."

                    if len(line_2) > 0 and len(street) == 0:
                        return "This field is required"

                    if (
                        not (ignore_required and country == "")
                        and country not in COUNTRIES
                    ):
                        return "Value must be in COUNTRIES"

                    isUSA = country == "United States"
                    if (
                        not (ignore_required and state == "")
                        and isUSA
                        and state not in STATES
                        and state not in US_TERRITORIES
                    ):
                        return "Value must be in STATES"

                    if (
                        not (ignore_required and postal_code == "")
                        and isUSA
                        and not fullmatch(r"\d{5}(-\d{4})?", postal_code)
                    ):
                        return "Invalid Zip code"

                    if (
                        not (ignore_required and postal_code is None)
                        and not isUSA
                        and not fullmatch(r"[ a-z-A-Z\d-]+", postal_code)
                    ):
                        return "Postal codes may only contain numbers, letters, hyphens and spaces"

                case _:
                    logger.warning(
                        f"'{item['name']}' has invalid item type '{item['type']}"
                    )
        else:
            return "Invalid Value."
    # Items hidden by rules should be None/null
    elif value is not None:
        return "Invalid Value."


def _validate_multi_item(item, values, partial=False):
    errors = []

    item_values = values.get(item["name"], [])

    if all_rules_pass(item["rules"], values):
        if source_name := item.get("source"):
            source = values.get(source_name, [])[
                item.get("start", 0) : item.get("stop", None)
            ]
            if len(item_values) != len(source):
                errors.append(
                    f"{item['name']} must have exactly the same number of items as {source}."
                )
        else:
            if item.get("minItems", 0) > len(item_values):
                errors.append(
                    f"{item['name']} must have at least {item['minItems']} values."
                )

            if item.get("maxItems", inf) < len(item_values):
                errors.append(
                    f"{item['name']} cannot have more than {item['maxItems']} values."
                )

        for _index, val in enumerate(item_values):
            checked_fields = set()
            for row in item["rows"]:
                _errors, _checked = _validate_row(
                    row, {**values, "_index": _index}, partial=partial
                )
                errors += _errors
                checked_fields |= _checked
            for key in val:
                name = f"{item['name']}.{{{{$index}}}}.{key}"
                if name not in checked_fields:
                    errors.append(
                        {
                            "name": f"{item['name']}.{_index}.{key}",
                            "error": "Extra fields not allowed.",
                        }
                    )

    elif len(item_values) != 0:
        return "Invalid Value."

    return errors


def _parse_validator_exp(validator_exp):
    # Based on https://stackoverflow.com/a/46946490
    def _get_matches(p, c):
        if c == '"':
            p["quote"] = not p["quote"]
        elif not p["quote"] and c == " ":
            p["a"].append("")
        else:
            p["a"][-1] += re_sub(r"\\(.)", lambda m: m.group(1), c)
        return p

    if matches := re_findall(r"\\?.|^$", validator_exp):
        return reduce(
            _get_matches,
            matches,
            {"a": [""], "quote": False},
        )["a"]
    else:
        return validator_exp, []


def _all_validators_pass(field_validators, value, ignore_required=False):
    # Get validator set
    if isinstance(value, list):
        _validators = array_validators
    else:
        _validators = validators

    # Parse and run field_validators
    for validator_exp in field_validators:
        validator_name, *args = _parse_validator_exp(validator_exp)
        if validator_name in _validators:
            if validator_name == "REQUIRED" and ignore_required:
                continue
            if not _validators[validator_name](value, *args):
                return False
        else:
            logger.warning(f"Invalid validator identifier: '{validator_name}'")

    # All validators have passed
    return True


def _equals(val, valid_val, ignore_case=False):
    if (
        (ignore_case == True or ignore_case == "true")
        and type(val) == str
        and type(valid_val) == str
    ):
        return val.lower() == valid_val.lower()
    return val == valid_val


def _not_equals(val, invalid_val, ignore_case=False):
    if (
        (ignore_case == True or ignore_case == "true")
        and type(val) == str
        and type(invalid_val) == str
    ):
        return val.lower() != invalid_val.lower()
    return val != invalid_val


def _starts_with(val, search_str, ignore_case=False, start=None):
    if type(start) == str:
        start = int(start)
    if type(val) == str and type(search_str) == str:
        if ignore_case == True or ignore_case == "true":
            return val.lower().startswith(search_str.lower(), start)
        return val.startswith(search_str, start)
    return False


def _ends_with(val, search_str, ignore_case=False, start=None):
    if type(start) == str:
        start = int(start)
    if type(val) == str and type(search_str) == str:
        if ignore_case == True or ignore_case == "true":
            return val.lower().endswith(search_str.lower(), start)
        return val.endswith(search_str, start)
    return False


def _contains(val, search_str, ignore_case=False, start=None):
    if type(start) == str:
        start = int(start)
    if type(val) == str and type(search_str) == str:
        if ignore_case == True or ignore_case == "true":
            return val.lower().find(search_str.lower(), start)
        return val.find(search_str, start)
    return False


def _one_of(val, options, ignore_case=False):
    _options = set()
    for opt in options.split(";"):
        if opt[:7] == "PRESET:":
            _options |= PRESETS[opt[7:]]
        else:
            _options.add(opt)

    if ignore_case == "true" or ignore_case == True:
        _options = set(opt.lower() for opt in _options)
        if type(val) == str:
            val = val.lower()

    return val in _options


def _exclusive(vals, options):
    _vals = set(str(v) for v in vals)
    _options = set()
    for opt in options.split(";"):
        if opt[:7] == "PRESET:":
            _options |= PRESETS[opt[7:]]
        else:
            _options.add(opt)

    return len(_vals & _options) <= 1


def _dependent(vals, options):
    _vals = set(str(v) for v in vals)
    _options = set()
    for opt in options.split(";"):
        if opt[:7] == "PRESET:":
            _options |= PRESETS[opt[7:]]
        else:
            _options.add(opt)

    intersection = _vals & _options

    return len(intersection) == 0 or intersection == _options


# regex from: https://stackoverflow.com/a/46181
EMAIL_REGEX = r'(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))'

# regex from: https://stackoverflow.com/a/23299989
E164_PHONE_REGEX = r"\+[1-9]\d{1,14}"

SSN_REGEX = r"\d{9}$|^\d{3}-\d{2}-\d{4}"

validators = {
    "REQUIRED": lambda val, *_: val != "" and val is not None,
    "TEXT_ONLY": lambda val, *_: isinstance(val, str) and val.isalpha(),
    "ALPHA_NUMERIC": lambda val, *_: isinstance(val, str) and val.isalnum(),
    "EMAIL": lambda val, *_: (
        val is None or (isinstance(val, str) and bool(fullmatch(EMAIL_REGEX, val)))
    ),
    "PHONE_NUMBER": lambda val, *_: isinstance(val, str)
    and bool(fullmatch(E164_PHONE_REGEX, val)),
    "SSN": lambda val, *_: (
        val is None
        or (isinstance(val, int) and 100_00_0000 <= val <= 999_99_9999)
        or (isinstance(val, str) and bool(fullmatch(SSN_REGEX, val)))
    ),
    "EQUALS": _equals,
    "NOT_EQUALS": _not_equals,
    "MATCHES": lambda val, regex, flags=None: bool(
        fullmatch(f"{'(?'+flags+')' if flags else ''}{regex}", val)
    ),
    "STARTS_WITH": _starts_with,
    "ENDS_WITH": _ends_with,
    "CONTAINS": _contains,
    "ONE_OF": _one_of,
}

array_validators = {
    "REQUIRED": lambda values, *_: isinstance(values, list) and len(values) > 0,
    "SOME_REQUIRED": (
        lambda values, *_: isinstance(values, list)
        and any(val != "" and val != None for val in values)
    ),
    "ALL_REQUIRED": (
        lambda values, *_: isinstance(values, list)
        and all(val != "" and val != None for val in values)
    ),
    "EXCLUSIVE": _exclusive,
    "DEPENDENT": _dependent,
}
