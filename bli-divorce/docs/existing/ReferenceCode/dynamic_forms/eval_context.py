from math import isnan
from re import sub
from typing import Dict, List, Any
import importlib

from babel.numbers import format_currency
from babel.core import Locale
from easydict import EasyDict
from dateutil.parser import parse
from dateutil.relativedelta import relativedelta


def _date(date, action, *args):
    util = importlib.import_module("dynamic_forms.util")

    ALLOWED_ACTIONS = {"add", "format", "subtract"}

    if action not in ALLOWED_ACTIONS:
        return date
    if type(date) is str:
        d = parse(date)
    else:
        d = date

    match action:
        case "add":
            return d + relativedelta(**{args[1] + "s": args[0]})
        case "format":
            return d.strftime(util.convert_format(args[0]))
        case "subtract":
            return d + relativedelta(**{args[1] + "s": -1 * args[0]})


_globals = {
    "__builtins__": {
        "abs": abs,
        "bool": bool,
        "float": float,
        "int": int,
        "max": max,
        "min": min,
        "pow": pow,
        "str": str,
        "sum": sum,
    },
    "_date": _date,
    "_if": lambda cond, true, false: true if cond else false,
    "_truthy": lambda val: bool(val) and not isnan(val if type(val) == float else 0),
    "_startsWith": lambda val, *args: (
        val.startswith(*args) if isinstance(val, str) else False
    ),
    "_selectKey": lambda items, key, default=None: tuple(
        obj.get(key, default) for obj in items
    ),
    "_toCurrency": lambda val, locale="en-US", currency="USD": format_currency(
        val, currency, locale=Locale.parse(locale, sep="-")
    ),
    # For JavaScript compatibility:
    "true": True,
    "false": False,
    "null": None,
    "undefined": None,
    "length": lambda x: len(x) if x is not None else 0,
}


def all_rules_pass(rules: List[str], context: Dict[str, Any]) -> bool:
    try:
        return all(evaluate(rule, context) == True for rule in rules)
    except:
        return False


def evaluate(
    expression: str, context: Dict[str, str | int | float] | "EvalContext"
) -> Any:
    """Evaluates an expression in a given context."""

    if isinstance(context, EvalContext):
        _locals = context
    else:
        _locals = EvalContext(context)

    _expression = expression
    subs = [
        ("$date", "_date"),
        ("$index", "_index"),
        ("$if", "_if"),
        ("$meta", "_meta"),
        ("$startsWith", "_startsWith"),
        ("$selectKey", "_selectKey"),
        ("$toCurrency", "_toCurrency"),
        ("$truthy", "_truthy"),
    ]
    for sub in subs:
        _expression = _expression.replace(*sub)

    try:
        return eval(_expression, _globals, _locals)
    except Exception as e:
        print(f"Error evaluating: '{expression}'")
        raise e from None


def replace_pipes(
    raw_str: str, context: Dict[str, str | int | float] | "EvalContext"
) -> Any:
    if type(raw_str) is not str:
        return raw_str

    def get_val(match):
        try:
            return str(evaluate(match[0][2:-2], context)) or match[0]
        except:
            return match[0]

    return sub(r"{{([^}]+)}}", get_val, raw_str)


class EvalContext(EasyDict):
    def __getitem__(self, item):
        try:
            return super().__getitem__(item)
        except KeyError as e:
            if item in _globals or item in _globals["__builtins__"]:
                raise e
            return None
