SUPPORTED_OPERATORS = {
    "Greater Than (>)",
    "Less Than (<)",
    "Greater Than or Equal (>=)",
    "Less Than or Equal (<=)",
    "Equal (=)",
}


def is_supported_operator(operator):
    return operator in SUPPORTED_OPERATORS


def check_threshold(value, operator, threshold):

    if operator == "Greater Than (>)":
        return value > threshold

    if operator == "Less Than (<)":
        return value < threshold

    if operator == "Greater Than or Equal (>=)":
        return value >= threshold

    if operator == "Less Than or Equal (<=)":
        return value <= threshold

    if operator == "Equal (=)":
        return value == threshold

    return False
