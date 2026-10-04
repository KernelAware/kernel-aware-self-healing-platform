import unittest

from load_data.system_metrics.metrics_loader import build_disk_query


class DiskQueryTests(unittest.TestCase):
    def test_partition_usage_query_uses_exported_partition_labels(self):
        query = build_disk_query(
            {
                "system_id": 1,
                "device": "/dev/sda1",
                "mountpoint": "/data",
                "filesystem": "ext4",
            },
            {"metric": "Disk Usage (%)"},
        )
        self.assertEqual(
            query,
            'disk_usage_percent{device="/dev/sda1",mountpoint="/data",filesystem="ext4",system_id="1"}',
        )

    def test_overall_metric_query_uses_scrape_system_label(self):
        query = build_disk_query(
            {"system_id": 1},
            {"metric": "Read IOPS"},
        )
        self.assertEqual(query, 'disk_read_iops{system_id="1"}')

    def test_device_metric_query_uses_exporter_disk_label(self):
        query = build_disk_query(
            {"system_id": 1, "disk": "sda"},
            {"metric": "Read IOPS"},
        )
        self.assertEqual(query, 'disk_per_read_iops{disk="sda",system_id="1"}')


if __name__ == "__main__":
    unittest.main()