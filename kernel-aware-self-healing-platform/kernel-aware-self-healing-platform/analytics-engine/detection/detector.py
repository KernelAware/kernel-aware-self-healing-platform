def detect_cpu(metrics, rules):
    threshold_result = check_cpu_threshold(metrics, rules)
    duration_result = check_cpu_duration(metrics, rules)

    return {
        "threshold": threshold_result,
        "duration": duration_result
    }

def detect_memory(events):
    pass

def detect_disk(events):
    pass

def detect(data):
    cpu_metrics = data["cpu"]

    detect_cpu(data["cpu"]["metrics"], data["cpu"]["rules"])

