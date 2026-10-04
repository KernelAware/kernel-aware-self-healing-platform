from detection.threshold import check_threshold
from detection.strategies.disk_detector import disk_identity, parse_target
from load_data.system_metrics.metrics_loader import DISK_METRIC_MAP


def test_disk_metric_mapping_uses_exporter_names():
    assert DISK_METRIC_MAP["Disk Usage (%)"] == (
        "disk_usage_percent",
        ("device", "mountpoint", "filesystem"),
    )
    assert DISK_METRIC_MAP["Read IOPS"][0] == "disk_read_iops"


def test_disk_target_identity_preserves_disk_scope():
    target = parse_target('{"host":"web-01","device":"/dev/sda1","mountpoint":"/data","filesystem":"ext4"}')
    assert disk_identity(target) == "web-01|/dev/sda1|/data|ext4|"


def test_disk_threshold_operators():
    assert check_threshold(91, "Greater Than (>)", 90)
    assert check_threshold(9, "Less Than (<)", 10)
    assert check_threshold(90, "Equal (=)", 90)