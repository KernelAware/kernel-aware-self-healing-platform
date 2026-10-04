export const DISK_METRICS = [
  { id: "Disk Usage (%)", title: "Disk Usage", unit: "%", prometheusMetric: "disk_usage_percent", labels: ["device", "mountpoint", "filesystem"], description: "Disk Usage measures the percentage of storage currently used on the selected filesystem or disk." },
  { id: "Read Throughput", title: "Read Throughput", unit: "MB/s", prometheusMetric: "disk_read_speed_mb", labels: [], description: "Read Throughput measures the overall rate of data read from disk." },
  { id: "Write Throughput", title: "Write Throughput", unit: "MB/s", prometheusMetric: "disk_write_speed_mb", labels: [], description: "Write Throughput measures the overall rate of data written to disk." },
  { id: "Read IOPS", title: "Read IOPS", unit: "IOPS", prometheusMetric: "disk_read_iops", labels: [], description: "Read IOPS measures overall read operations per second." },
  { id: "Write IOPS", title: "Write IOPS", unit: "IOPS", prometheusMetric: "disk_write_iops", labels: [], description: "Write IOPS measures overall write operations per second." },
  { id: "Read Latency", title: "Read Latency", unit: "ms", prometheusMetric: "disk_read_latency_ms", labels: [], description: "Read Latency measures overall disk read latency." },
  { id: "Write Latency", title: "Write Latency", unit: "ms", prometheusMetric: "disk_write_latency_ms", labels: [], description: "Write Latency measures overall disk write latency." },
  { id: "Disk Busy Time (%)", title: "Disk Busy Time", unit: "%", prometheusMetric: "disk_busy_percentage", labels: [], description: "Disk Busy Time measures overall active disk time." },
  { id: "Read Operations", title: "Read Operations", unit: "ops", prometheusMetric: "disk_read_count", labels: [], description: "Read Operations counts overall disk reads." },
  { id: "Write Operations", title: "Write Operations", unit: "ops", prometheusMetric: "disk_write_count", labels: [], description: "Write Operations counts overall disk writes." },
  { id: "Read Time", title: "Read Time", unit: "ms", prometheusMetric: "disk_read_time_ms", labels: [], description: "Read Time measures overall cumulative read time." },
  { id: "Write Time", title: "Write Time", unit: "ms", prometheusMetric: "disk_write_time_ms", labels: [], description: "Write Time measures overall cumulative write time." },
]

export const DISK_TARGET_TYPES = ["Host", "Disk / Device", "Filesystem / Mount Point"]
export const OPERATORS = ["Greater Than (>)", "Greater Than or Equal (>=)", "Less Than (<)", "Less Than or Equal (<=)", "Equal (=)"]
export const updateDisk = (setForm, values) => setForm(form => ({ ...form, ...values }))
export const metricFor = value => DISK_METRICS.find(metric => metric.id === value) || DISK_METRICS[0]
export const operatorSymbol = value => value?.match(/(?:>=|<=|>|<|=)/)?.[0] || ">"