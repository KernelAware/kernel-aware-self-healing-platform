export const DISK_METRICS = [
  { id: "disk_partition_info", title: "Partition Information", unit: "info", labels: ["device", "mountpoint", "filesystem"] },
  { id: "disk_partition_total_gb", title: "Partition Total Size", unit: "GB", labels: ["device", "mountpoint", "filesystem"] },
  { id: "disk_usage_percent", title: "Disk Usage", unit: "%", labels: ["device", "mountpoint", "filesystem"] },
  { id: "disk_read_bytes", title: "Disk Read Bytes", unit: "bytes", labels: [] },
  { id: "disk_write_bytes", title: "Disk Write Bytes", unit: "bytes", labels: [] },
  { id: "disk_read_count", title: "Disk Read Operations", unit: "operations", labels: [] },
  { id: "disk_write_count", title: "Disk Write Operations", unit: "operations", labels: [] },
  { id: "disk_read_time_ms", title: "Disk Read Time", unit: "ms", labels: [] },
  { id: "disk_write_time_ms", title: "Disk Write Time", unit: "ms", labels: [] },
  { id: "disk_busy_time_ms", title: "Disk Busy Time", unit: "ms", labels: [] },
  { id: "disk_per_read_bytes", title: "Per-Disk Read Bytes", unit: "bytes", labels: ["disk"] },
  { id: "disk_per_write_bytes", title: "Per-Disk Write Bytes", unit: "bytes", labels: ["disk"] },
  { id: "disk_per_read_count", title: "Per-Disk Read Operations", unit: "operations", labels: ["disk"] },
  { id: "disk_per_write_count", title: "Per-Disk Write Operations", unit: "operations", labels: ["disk"] },
  { id: "disk_per_read_time_ms", title: "Per-Disk Read Time", unit: "ms", labels: ["disk"] },
  { id: "disk_per_write_time_ms", title: "Per-Disk Write Time", unit: "ms", labels: ["disk"] },
  { id: "disk_per_busy_time_ms", title: "Per-Disk Busy Time", unit: "ms", labels: ["disk"] },
  { id: "disk_read_speed_mb", title: "Read Throughput", unit: "MB/s", labels: [] },
  { id: "disk_write_speed_mb", title: "Write Throughput", unit: "MB/s", labels: [] },
  { id: "disk_per_read_speed_mb", title: "Per-Disk Read Throughput", unit: "MB/s", labels: ["disk"] },
  { id: "disk_per_write_speed_mb", title: "Per-Disk Write Throughput", unit: "MB/s", labels: ["disk"] },
  { id: "disk_read_iops", title: "Read IOPS", unit: "IOPS", labels: [] },
  { id: "disk_write_iops", title: "Write IOPS", unit: "IOPS", labels: [] },
  { id: "disk_total_iops", title: "Total IOPS", unit: "IOPS", labels: [] },
  { id: "disk_per_read_iops", title: "Per-Disk Read IOPS", unit: "IOPS", labels: ["disk"] },
  { id: "disk_per_write_iops", title: "Per-Disk Write IOPS", unit: "IOPS", labels: ["disk"] },
  { id: "disk_per_total_iops", title: "Per-Disk Total IOPS", unit: "IOPS", labels: ["disk"] },
  { id: "disk_read_latency_ms", title: "Read Latency", unit: "ms", labels: [] },
  { id: "disk_write_latency_ms", title: "Write Latency", unit: "ms", labels: [] },
  { id: "disk_per_read_latency_ms", title: "Per-Disk Read Latency", unit: "ms", labels: ["disk"] },
  { id: "disk_per_write_latency_ms", title: "Per-Disk Write Latency", unit: "ms", labels: ["disk"] },
  { id: "disk_busy_percentage", title: "Disk Busy Percentage", unit: "%", labels: [] },
  { id: "disk_per_busy_percentage", title: "Per-Disk Busy Percentage", unit: "%", labels: ["disk"] },
].map(metric => ({
  ...metric,
  description: `${metric.title} exported by the KAISP monitoring agent.`,
}))

export const diskMetricsFromPrometheus = names => DISK_METRICS.filter(metric => names.includes(metric.id))

export const DISK_TARGET_TYPES = ["Host", "Disk / Device", "Filesystem / Mount Point"]
export const OPERATORS = ["Greater Than (>)", "Greater Than or Equal (>=)", "Less Than (<)", "Less Than or Equal (<=)", "Equal (=)"]
export const updateDisk = (setForm, values) => setForm(form => ({ ...form, ...values }))
export const metricFor = value => DISK_METRICS.find(metric => metric.id === value) || DISK_METRICS[0]
export const operatorSymbol = value => value?.match(/(?:>=|<=|>|<|=)/)?.[0] || ">"

export const diskTargetType = targetType => {
  if (targetType === "Disk / Device") return "disk"
  if (targetType === "Filesystem / Mount Point") return "filesystem"
  return "host"
}

export const diskTargetName = form => {
  if (form.targetName) return form.targetName
  if (form.targetType === "Disk / Device") return form.device || ""
  if (form.targetType === "Filesystem / Mount Point") return form.mountPoint || ""
  return form.host || ""
}

export const updateDiskTarget = (setForm, values = {}) => setForm(current => {
  const next = { ...current, ...values }
  const type = next.selectionType === "process" ? "process" : diskTargetType(next.targetType)
  const name = diskTargetName(next)
  const targets = Array.isArray(next.targets) ? next.targets : []
  const targetIndex = targets.findIndex(target => ["host", "disk", "filesystem", "process"].includes(target.type))
  const existing = targetIndex >= 0 ? targets[targetIndex] : { metrics: [] }
  const metrics = existing.metrics?.length ? existing.metrics : [{
    name: next.metric || "",
    conditions: [{
      metric: next.metric || "",
      operator: next.condOperator || "Greater Than (>)",
      threshold: next.condThreshold || "",
      duration: next.condDuration || "5",
      durationUnit: next.condDurationUnit || "Minutes",
    }],
  }]
  const { pid, processName, ...existingTarget } = existing
  const target = { ...existingTarget, type, name, host: next.host ?? "", metrics }

  return {
    ...next,
    targets: targetIndex >= 0
      ? targets.map((item, index) => index === targetIndex ? target : item)
      : [...targets, target],
  }
})

export const updateDiskMetric = (setForm, metricId) => setForm(current => {
  const targets = Array.isArray(current.targets) ? current.targets : []
  const targetIndex = targets.findIndex(target => ["host", "disk", "filesystem", "process"].includes(target.type))
  if (targetIndex < 0) return { ...current, metric: metricId, condMetric: metricId, recoveryMetric: metricId }

  const target = targets[targetIndex]
  const metrics = Array.isArray(target.metrics) ? target.metrics : []
  const metricIndex = metrics.findIndex(item => item.name === metricId)
  const metric = metricIndex >= 0
    ? metrics[metricIndex]
    : {
        name: metricId,
        conditions: [{
          metric: metricId,
          operator: "Greater Than (>)",
          threshold: "",
          duration: "5",
          durationUnit: "Minutes",
        }],
      }

  return {
    ...current,
    metric: metricId,
    condMetric: metricId,
    recoveryMetric: metricId,
    targets: targets.map((item, index) => index === targetIndex ? { ...item, metrics: [{ ...metric, name: metricId, conditions: (metric.conditions || []).map((condition, conditionIndex) => conditionIndex === 0 ? { ...condition, metric: metricId } : condition) }] } : item),
  }
})
