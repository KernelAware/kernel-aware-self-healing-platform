from load_data.system_metrics.metrics_loader import get_memory_metrics
from detection.threshold import check_threshold

metrics = get_memory_metrics(1)

print("Prometheus memory results:", metrics)

for metric in metrics:
    value = float(metric["value"][1])
    violated = check_threshold(value, ">", 90.0)

    print(f"Memory usage: {value}%")
    print(f"Above 90%: {violated}")