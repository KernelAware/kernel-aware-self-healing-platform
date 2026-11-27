from decimal import Decimal, InvalidOperation


SUPPORTED_OPERATORS = {
    "Greater Than (>)",
    "Less Than (<)",
    "Greater Than or Equal (>=)",
    "Less Than or Equal (<=)",
    "Equal (=)",
    ">",
    "<",
    ">=",
    "<=",
    "==",
    "!=",
    "Greater Than or Equal To (>=)",
    "Less Than or Equal To (<=)",
    "Equal To (==)",
    "Not Equal To (!=)",
}


def is_supported_operator(operator):
    return operator in SUPPORTED_OPERATORS


def check_threshold(value, operator, threshold):
    normalized = " ".join(str(operator).split())
    comparisons = {
        ">": lambda left, right: left > right,
        "Greater Than (>)": lambda left, right: left > right,
        "<": lambda left, right: left < right,
        "Less Than (<)": lambda left, right: left < right,
        ">=": lambda left, right: left >= right,
        "Greater Than or Equal (>=)": lambda left, right: left >= right,
        "Greater Than or Equal To (>=)": lambda left, right: left >= right,
        "<=": lambda left, right: left <= right,
        "Less Than or Equal (<=)": lambda left, right: left <= right,
        "Less Than or Equal To (<=)": lambda left, right: left <= right,
        "==": lambda left, right: left == right,
        "Equal (=)": lambda left, right: left == right,
        "Equal To (==)": lambda left, right: left == right,
        "!=": lambda left, right: left != right,
        "Not Equal To (!=)": lambda left, right: left != right,
    }
    compare = comparisons.get(normalized)
    if compare is None:
        return False

    # Prometheus and rule payloads can represent numeric values as strings.
    # Decimal avoids lexical string comparisons while keeping integer precision.
    if isinstance(value, str) or isinstance(threshold, str):
        try:
            value, threshold = Decimal(str(value)), Decimal(str(threshold))
        except (InvalidOperation, ValueError):
            return False

    try:
        return compare(value, threshold)
    except (TypeError, ValueError):
        return False
