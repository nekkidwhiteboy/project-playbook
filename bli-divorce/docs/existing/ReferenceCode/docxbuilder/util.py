def replace_deep(obj, to_replace=None, replacement=""):
    try:
        new_obj = {}
        for key, val in obj.items():
            if type(val) is list:
                new_obj[key] = [
                    replace_deep(sub_val, to_replace=to_replace,
                                 replacement=replacement)
                    for sub_val in val
                ]
            elif type(val) is dict:
                new_obj[key] = replace_deep(
                    val, to_replace=to_replace, replacement=replacement)
            elif val == to_replace:
                new_obj[key] = replacement
            else:
                new_obj[key] = val

        return new_obj
    except AttributeError:
        if obj == to_replace:
            return replacement
        return obj
