def check_threshold(value, operator, threshold):

    if operator == "Greater Than (>)":
        print(value)
        print(threshold)
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