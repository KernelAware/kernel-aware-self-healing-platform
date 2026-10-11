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

export const diskTargetType = targetType => {
  if (targetType === "Disk / Device") return "disk"
  if (targetType === "Filesystem / Mount Point") return "filesystem"
  return "host"
}

export const diskTargetName = form => {
  if (form.targetType === "Disk / Device") return form.device || ""
  if (form.targetType === "Filesystem / Mount Point") return form.mountPoint || ""
  return form.host || ""
}

export const updateDiskTarget = (setForm, values = {}) => setForm(current => {
  const next = { ...current, ...values }
  const type = diskTargetType(next.targetType)
  const name = diskTargetName(next)
  const targets = Array.isArray(next.targets) ? next.targets : []
  const targetIndex = targets.findIndex(target => ["host", "disk", "filesystem"].includes(target.type))
  const existing = targetIndex >= 0 ? targets[targetIndex] : { metrics: [] }
  const metrics = existing.metrics?.length ? existing.metrics : [{
    name: next.metric || DISK_METRICS[0].id,
    conditions: [{
      metric: next.metric || DISK_METRICS[0].id,
      operator: next.condOperator || "Greater Than (>)",
      threshold: next.condThreshold || "",
      duration: next.condDuration || "5",
      durationUnit: next.condDurationUnit || "Minutes",
    }],
  }]
  const target = { ...existing, type, name, host: next.host || "", metrics }

  return {
    ...next,
    targets: targetIndex >= 0
      ? targets.map((item, index) => index === targetIndex ? target : item)
      : [...targets, target],
  }
})

export const updateDiskMetric = (setForm, metricId) => setForm(current => {
  const targets = Array.isArray(current.targets) ? current.targets : []
  const targetIndex = targets.findIndex(target => ["host", "disk", "filesystem"].includes(target.type))
  if (targetIndex < 0) return current

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