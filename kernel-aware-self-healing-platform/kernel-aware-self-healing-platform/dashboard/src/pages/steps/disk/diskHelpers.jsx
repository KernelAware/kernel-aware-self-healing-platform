export const DISK_METRICS = [
  { id: "Disk Usage (%)", title: "Disk Usage", unit: "%", description: "Disk Usage measures the percentage of storage currently used on the selected filesystem or disk." },
  { id: "Free Space", title: "Free Space", unit: "GB", description: "Free Space measures storage available on the selected filesystem or disk." },
  { id: "Used Space", title: "Used Space", unit: "GB", description: "Used Space measures storage consumed by files on the selected filesystem or disk." },
  { id: "Read Throughput", title: "Read Throughput", unit: "MB/s", description: "Read Throughput measures the rate of data read from the selected disk." },
  { id: "Write Throughput", title: "Write Throughput", unit: "MB/s", description: "Write Throughput measures the rate of data written to the selected disk." },
  { id: "Read IOPS", title: "Read IOPS", unit: "IOPS", description: "Read IOPS measures read operations per second." },
  { id: "Write IOPS", title: "Write IOPS", unit: "IOPS", description: "Write IOPS measures write operations per second." },
  { id: "Read Latency", title: "Read Latency", unit: "ms", description: "Read Latency measures the time required to complete disk reads." },
  { id: "Write Latency", title: "Write Latency", unit: "ms", description: "Write Latency measures the time required to complete disk writes." },
  { id: "Disk Busy Time (%)", title: "Disk Busy Time", unit: "%", description: "Disk Busy Time measures how long the disk is actively servicing requests." },
  { id: "Read Operations", title: "Read Operations", unit: "ops", description: "Read Operations counts disk read operations." },
  { id: "Write Operations", title: "Write Operations", unit: "ops", description: "Write Operations counts disk write operations." },
  { id: "Read Time", title: "Read Time", unit: "ms", description: "Read Time measures cumulative time spent reading." },
  { id: "Write Time", title: "Write Time", unit: "ms", description: "Write Time measures cumulative time spent writing." },
  { id: "Read Size", title: "Read Size", unit: "MB", description: "Read Size measures the size of data read during evaluation." },
  { id: "Write Size", title: "Write Size", unit: "MB", description: "Write Size measures the size of data written during evaluation." },
]

export const DISK_TARGET_TYPES = ["Host", "Disk / Device", "Filesystem / Mount Point"]
export const OPERATORS = ["Greater Than (>)", "Greater Than or Equal (>=)", "Less Than (<)", "Less Than or Equal (<=)", "Equal (=)"]
export const updateDisk = (setForm, values) => setForm(form => ({ ...form, ...values }))
export const metricFor = value => DISK_METRICS.find(metric => metric.id === value) || DISK_METRICS[0]
export const operatorSymbol = value => value?.match(/(?:>=|<=|>|<|=)/)?.[0] || ">"