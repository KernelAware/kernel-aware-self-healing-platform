def check_threshold(value, operator, threshold):
    print("operator: ", operator)
    print("threshold: ", threshold)
    print("value: ", value)
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