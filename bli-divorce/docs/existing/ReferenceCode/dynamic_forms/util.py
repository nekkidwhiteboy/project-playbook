from copy import copy
from datetime import datetime
from re import split, sub
from typing import Any, Dict, List

from .eval_context import EvalContext, all_rules_pass
from .constants import PRESETS


def get_next_page(page_rules, items):
    _items = EvalContext(items)
    for page_rules in page_rules:
        if all_rules_pass(page_rules.rules, _items):
            return page_rules.page

    return None


def iter_pages(init_page, items={}):
    page = init_page
    yield page
    while page := get_next_page(page.next.all(), items):
        yield page


def calc_percentage(result, page_id):
    pages = list(p.pk for p in iter_pages(result.form.root_page, result.items))
    return pages.index(page_id) / len(pages)


def getIn(obj: Dict | EvalContext, path: str | List, default=None):
    """Deeply get a value from an object via its path.

    Does not support bracket notation (i.e. foo.bar[0])

    Based off "getIn" util method from Formik.
    See: https://github.com/jaredpalmer/formik/blob/master/packages/formik/src/utils.ts

    Example:
    >>> getIn({"foo": {"bar": ["baz"]}}, "foo.bar.0")
    'baz'
    >>> util.getIn({}, "foo.0.baz")
    None
    """

    if type(path) is not list:
        path = [k if not k.isnumeric() else int(k) for k in split("[.]", path)]
    p = 0
    while obj is not None and p < len(path):
        try:
            obj = obj[path[p]]
            p += 1
        except (KeyError, IndexError):
            obj = None

    return obj if obj is not None else default


def setIn(obj: Dict | EvalContext, path: str, value: Any):
    """Deeply set a value from in object via it's path.

    Does not support bracket notation (i.e. foo.bar[0])

    If the value at `path` has changed, return a shallow copy of obj with `value` set at `path`.
    If `value` has not changed, return the original `obj`.

    Based of `setIn` util method from Formik.
    See: https://github.com/jaredpalmer/formik/blob/master/packages/formik/src/utils.ts

    Example:
    >>> setIn({"foo": {"bar": ["baz"]}}, "foo.bar.0", "biz")
    {'foo': {'bar': ['biz']}}

    >>> setIn({}, "foo.1.bar", "biz")
    {'foo': [None, {'bar': 'biz'}]}
    """

    res = copy(obj)
    res_val = res
    path_array = [k if not k.isnumeric() else int(k) for k in split("[.]", path)]
    i = 0
    for current_path in path_array[:-1]:
        current_obj = getIn(obj, path_array[: i + 1])

        if current_obj is not None and type(current_obj) in (EvalContext, dict, list):
            res_val[current_path] = copy(current_obj)
            if type(current_obj) is list:
                # If current_obj is a list, path_array[i+1] must be an index
                # Pad the list with None's so that the index will exist
                while len(res_val[current_path]) <= path_array[i + 1]:
                    res_val[current_path].append(None)
            res_val = res_val[current_path]
        else:
            next_path = path_array[i + 1]
            if type(next_path) is int and next_path >= 0:
                # Fill the list with None's, so that an index at next_path will exist
                res_val[current_path] = [None] * (next_path + 1)
            else:
                res_val[current_path] = {}
            res_val = res_val[current_path]
        i += 1

    try:
        if (obj if i == 0 else res_val)[path_array[i]] == value:
            return obj
    except KeyError:
        # Catch the error thrown when the key to be set is not yet in the obj.
        # This can be passed because it will be set below.
        pass

    res_val[path_array[i]] = value

    return res


def get_datetime_prefix():
    try:
        # Works on Windows only
        datetime.now().strftime("%#I")
        return "#"
    except ValueError:
        try:
            # Works on Linux/OSX only
            datetime.now().strftime("%-I")
            return "-"
        except ValueError:
            return ""


def convert_format(format):
    """Converts a Day.js format to one supported by datetime.strftime

    Day.js format codes: https://day.js.org/docs/en/display/format

    Python format codes: https://docs.python.org/3/library/datetime.html#strftime-and-strptime-format-codes
    """

    prefix = get_datetime_prefix()

    subs = (
        ("YYYY", r"%Y"),
        ("YY", r"%y"),
        ("MMMM", r"%B"),
        ("MMM", r"%b"),
        ("MM", r"%m"),
        ("M", rf"%{prefix}m"),
        ("DD", r"%d"),
        ("D", rf"%{prefix}d"),
        ("HH", r"%H"),
        ("H", rf"%{prefix}H"),
        ("hh", r"%I"),
        ("h", rf"%{prefix}I"),
        ("mm", r"%M"),
        ("m", rf"%{prefix}M"),
        ("ss", r"%S"),
        ("s", rf"%{prefix}S"),
        ("SSS", r"%f"),
        ("ZZ", r"%z"),
        ("A", r"%p"),
    )
    result = format
    for js, py in subs:
        result = sub(r"(?<!%)(?<!%[-#])" + js, py, result)
    return result


def expand_option_presets(options, values):
    for option in options:
        if type(option) == dict and "preset" in option:
            if all_rules_pass(option.get("rules", []), values):
                if option["preset"] in PRESETS:
                    yield from (
                        PRESETS[option["preset"]] - set(option.get("exclude", []))
                    )
        else:
            yield option


BasicTypes = str | int | float | bool | None
ResultItems = Dict[
    str, BasicTypes | List[BasicTypes] | List["ResultItems"] | "ResultItems"
]


def strip_recursive(
    obj: BasicTypes | List[BasicTypes] | ResultItems | List[ResultItems],
):
    if type(obj) is str:
        return obj.strip()

    if type(obj) is list:
        for i in range(len(obj)):
            obj[i] = strip_recursive(obj[i])
        return obj

    if type(obj) is dict:
        for key in obj.keys():
            obj[key] = strip_recursive(obj[key])
        return obj

    return obj
