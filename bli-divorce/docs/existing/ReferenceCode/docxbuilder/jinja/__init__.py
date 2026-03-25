from jinja2 import Environment, meta
from . import filters, tests


def get_environment():
    env = Environment(autoescape=True)
    env.filters["a_an"] = filters.a_an
    env.filters["age"] = filters.age
    env.filters["c"] = filters.concat
    env.filters["concat"] = filters.concat
    env.filters["date"] = filters.format_date
    env.filters["get"] = filters.get_item
    env.filters["initials"] = filters.initials
    env.filters["money"] = filters.money
    env.filters["pl"] = filters.pl
    env.filters["percentage"] = filters.percent
    env.filters["p"] = filters.percent
    env.filters["phone"] = filters.phone
    env.filters["pick"] = filters.pick
    env.filters["substr"] = filters.substr
    env.filters["t"] = filters.pick
    env.filters["words"] = filters.words

    env.tests["after"] = tests.after
    env.tests["before"] = tests.before
    env.tests["partiallyEmpty"] = tests.partially_empty

    return env


DEFAULT_JINJA_ENV = get_environment()
