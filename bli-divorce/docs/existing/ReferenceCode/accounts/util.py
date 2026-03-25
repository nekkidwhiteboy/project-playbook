from functools import wraps


def raise_exception(error_type: Exception = ValueError, message: str | None = None):
    """Intercepts 'raise_exception' kwarg.

    If raise_exception == True, and the wrapped function returns a falsy value,
    this decorator will raise an exception

    :param error_type: The class of error that will be raised
    :param message: The message passed to the error raised
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, raise_exception=False, **kwargs):
            if not (res := func(*args, **kwargs)) and raise_exception:
                raise error_type(message)
            return res

        return wrapper

    return decorator
