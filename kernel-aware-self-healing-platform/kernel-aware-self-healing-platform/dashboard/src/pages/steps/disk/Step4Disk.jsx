import { useEffect, useMemo, useState } from "react"
import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"
import { queryPrometheus, queryPrometheusMetricNames } from "@/services/api"
import { DISK_METRICS, diskMetricsFromPrometheus, updateDiskMetric, updateDiskTarget } from "./diskHelpers"

const TARGET_OPTIONS = [
  { value: "", label: "Select a target..." },
  { value: "system", label: "Whole System" },
  { value: "process", label: "Process" },
]
const SYSTEM_MORE_METRICS = [
  "disk_read_bytes", "disk_write_bytes", "disk_read_count", "disk_write_count",
  "disk_read_time_ms", "disk_write_time_ms", "disk_busy_time_ms",
  "disk_read_speed_mb", "disk_write_speed_mb", "disk_read_iops", "disk_write_iops",
  "disk_total_iops", "disk_read_latency_ms", "disk_write_latency_ms", "disk_busy_percentage",
]

const valueOf = result => {
  const value = Number(result?.value?.[1])
  return Number.isFinite(value) ? value : null
}

const formatBytes = value => {
  if (value == null) return "Metric unavailable"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let size = value
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }
  return `${size.toFixed(2)} ${units[unit]}`
}

const formatNumber = (value, suffix = "") => value == null ? "Metric unavailable" : `${value.toFixed(2)}${suffix}`

const formatMetricValue = (metric, value) => {
  if (value == null) return "Metric unavailable"
  if (metric.endsWith("_bytes")) return formatBytes(value)
  const unit = metric.endsWith("_speed_mb") ? " MB/s"
    : metric.endsWith("_time_ms") || metric.endsWith("_latency_ms") ? " ms"
      : metric.endsWith("_iops") ? " IOPS"
        : metric.endsWith("_count") ? " operations"
        : metric.endsWith("_percentage") ? "%" : ""
  return `${value.toFixed(2)}${unit}`
}

function DetailsValue({ label, value }) {
  return <div className="flex items-start justify-between gap-4 border-t border-emerald-700/10 pt-2">
    <span className="font-mono text-[11px] text-muted-foreground">{label}</span>
    <span className="text-right font-mono text-[11px] font-semibold text-foreground">{value}</span>
  </div>
}

export default function Step4Disk({ form, setForm, validationError, clearValidationError }) {
  const [availableMetrics, setAvailableMetrics] = useState([])
  const [metricState, setMetricState] = useState("loading")
  const [metricError, setMetricError] = useState("")
  const [processes, setProcesses] = useState([])
  const [processState, setProcessState] = useState("loading")
  const [processError, setProcessError] = useState("")
  const [systemDetails, setSystemDetails] = useState([])
  const [systemState, setSystemState] = useState("loading")
  const [processDetails, setProcessDetails] = useState(null)
  const [processDetailsState, setProcessDetailsState] = useState("idle")
  const [systemMoreDetails, setSystemMoreDetails] = useState([])
  const [systemMoreState, setSystemMoreState] = useState("idle")
  const [showMore, setShowMore] = useState(false)
  const [processListExpanded, setProcessListExpanded] = useState(false)
  const [systemPartitionsExpanded, setSystemPartitionsExpanded] = useState(false)

  const diskTarget = useMemo(() => form.targets?.find(item => ["host", "disk", "filesystem", "process"].includes(item.type)), [form.targets])
  const selectedTarget = form.selectionType || (diskTarget?.type === "process" ? "process" : diskTarget ? "system" : "")
  const selectedProcess = processes.find(item => item.pid === String(form.processId || diskTarget?.pid || "")) || (diskTarget?.type === "process" && diskTarget.pid
    ? { pid: String(diskTarget.pid), name: diskTarget.processName || diskTarget.name?.replace(/\s+\(PID \d+\)$/, "") || "Unknown process" }
    : null)
  const metric = availableMetrics.find(item => item.id === form.metric) || DISK_METRICS.find(item => item.id === form.metric)
  const displayedProcesses = processListExpanded ? processes : processes.slice(0, 3)
  const displayedSystemDetails = systemPartitionsExpanded ? systemDetails : systemDetails.slice(0, 3)

  useEffect(() => {
    let active = true
    queryPrometheusMetricNames()
      .then(names => {
        if (!active) return
        const metrics = diskMetricsFromPrometheus(names)
        setAvailableMetrics(metrics)
        setMetricState(metrics.length ? "ready" : "empty")
        setMetricError("")
        const selected = metrics.find(item => item.id === form.metric) || metrics.find(item => item.id === "disk_usage_percent") || metrics[0]
        if (selected && selected.id !== form.metric) updateDiskMetric(setForm, selected.id)
      })
      .catch(error => {
        if (!active) return
        setAvailableMetrics([])
        setMetricState("error")
        setMetricError(error.message || "Unable to query Prometheus")
      })
    return () => { active = false }
  }, [setForm])

  useEffect(() => {
    if (!["system", "process"].includes(selectedTarget)) {
      setProcesses([])
      setProcessState("idle")
      return
    }
    let active = true
    setProcessState("loading")
    const loadProcesses = async () => {
      try {
        const rows = await queryPrometheus("process_status")
        if (!active) return
        const byPid = new Map()
        rows.forEach(row => {
          const pid = row.metric?.pid
          const name = row.metric?.name
          if (pid && name) byPid.set(pid, { pid, name, status: row.metric?.status })
        })
        setProcesses([...byPid.values()].sort((a, b) => a.name.localeCompare(b.name) || a.pid.localeCompare(b.pid)))
        setProcessState(byPid.size ? "ready" : "empty")
        setProcessError("")
      } catch (error) {
        if (!active) return
        setProcesses([])
        setProcessState("error")
        setProcessError(error.message || "Unable to query Prometheus")
      }
    }
    loadProcesses()
    const timer = window.setInterval(loadProcesses, 15000)
    return () => { active = false; window.clearInterval(timer) }
  }, [selectedTarget])

  useEffect(() => {
    setProcessListExpanded(false)
    setSystemPartitionsExpanded(false)
  }, [selectedTarget])

  useEffect(() => {
    if (selectedTarget !== "system") {
      setSystemState("idle")
      return
    }
    let active = true
    const loadSystemDetails = async () => {
      try {
        const [totals, usages] = await Promise.all([
          queryPrometheus("disk_partition_total_gb"),
          queryPrometheus("disk_usage_percent"),
        ])
        if (!active) return
        const usagesByMount = new Map(usages.map(row => [row.metric?.mountpoint, valueOf(row)]))
        const partitions = totals.map(row => ({
          mountpoint: row.metric?.mountpoint || row.metric?.device || "Disk partition",
          device: row.metric?.device,
          totalGb: valueOf(row),
          usagePercent: usagesByMount.get(row.metric?.mountpoint) ?? null,
        }))
        setSystemDetails(partitions)
        setSystemState(partitions.length ? "ready" : "empty")
      } catch {
        if (!active) return
        setSystemDetails([])
        setSystemState("error")
      }
    }
    setSystemState("loading")
    loadSystemDetails()
    const timer = window.setInterval(loadSystemDetails, 5000)
    return () => { active = false; window.clearInterval(timer) }
  }, [selectedTarget])

  useEffect(() => {
    if (selectedTarget !== "system" || !showMore) {
      setSystemMoreState("idle")
      setSystemMoreDetails([])
      return
    }
    const metrics = availableMetrics.filter(item => SYSTEM_MORE_METRICS.includes(item.id))
    if (!metrics.length) {
      setSystemMoreDetails([])
      setSystemMoreState("empty")
      return
    }
    let active = true
    const loadMoreDetails = async () => {
      try {
        const rows = await Promise.all(metrics.map(async metricInfo => ({
          metric: metricInfo,
          value: valueOf((await queryPrometheus(metricInfo.id))[0]),
        })))
        if (!active) return
        setSystemMoreDetails(rows.filter(row => row.value != null))
        setSystemMoreState(rows.some(row => row.value != null) ? "ready" : "empty")
      } catch {
        if (!active) return
        setSystemMoreDetails([])
        setSystemMoreState("error")
      }
    }
    setSystemMoreState("loading")
    loadMoreDetails()
    const timer = window.setInterval(loadMoreDetails, 5000)
    return () => { active = false; window.clearInterval(timer) }
  }, [selectedTarget, showMore, availableMetrics])

  useEffect(() => {
    if (selectedTarget !== "process" || !selectedProcess) {
      setProcessDetails(null)
      setProcessDetailsState(selectedTarget === "process" ? "empty" : "idle")
      return
    }
    let active = true
    const loadProcessDetails = async () => {
      try {
        const pid = selectedProcess.pid.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
        const name = selectedProcess.name.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
        const [reads, writes] = await Promise.all([
          queryPrometheus(`process_disk_read_bytes{pid="${pid}",name="${name}"}`),
          queryPrometheus(`process_disk_write_bytes{pid="${pid}",name="${name}"}`),
        ])
        if (!active) return
        setProcessDetails({ readBytes: valueOf(reads[0]), writeBytes: valueOf(writes[0]) })
        setProcessDetailsState("ready")
      } catch {
        if (!active) return
        setProcessDetails(null)
        setProcessDetailsState("error")
      }
    }
    setProcessDetailsState("loading")
    loadProcessDetails()
    const timer = window.setInterval(loadProcessDetails, 5000)
    return () => { active = false; window.clearInterval(timer) }
  }, [selectedTarget, selectedProcess?.pid, selectedProcess?.name])

  const chooseTarget = type => {
    clearValidationError?.()
    setShowMore(false)
    if (type === "system") {
      updateDiskTarget(setForm, { selectionType: type, targetType: "Host", host: null, mountPoint: "", device: "", targetName: "Whole System" })
    } else {
      setForm(current => ({
        ...current,
        targets: (Array.isArray(current.targets) ? current.targets : []).filter(item => item !== diskTarget),
        selectionType: type,
        processId: "",
      }))
    }
  }

  const chooseProcess = pid => {
    const process = processes.find(item => item.pid === pid)
    if (!process) return
    clearValidationError?.()
    setShowMore(false)
    const existing = Array.isArray(form.targets) ? form.targets : []
    const nextTarget = {
      ...(existing.find(item => item.type === "process") || {}),
      type: "process",
      name: `${process.name} (PID ${process.pid})`,
      pid: process.pid,
      processName: process.name,
      host: null,
      metrics: existing.find(item => item.type === "process")?.metrics || [{
        name: form.metric || "",
        conditions: [{
          metric: form.condMetric || form.metric || "",
          operator: form.condOperator || "Greater Than (>)",
          threshold: form.condThreshold || "",
          duration: form.condDuration || "5",
          durationUnit: form.condDurationUnit || "Minutes",
        }],
      }],
    }
    setForm(current => ({
      ...current,
      selectionType: "process",
      processId: process.pid,
      processName: process.name,
      targets: [...(Array.isArray(current.targets) ? current.targets.filter(item => item !== diskTarget) : []), nextTarget],
    }))
  }

  const removeTarget = () => {
    clearValidationError?.()
    setShowMore(false)
    setForm(current => ({
      ...current,
      selectionType: "",
      processId: "",
      targets: (Array.isArray(current.targets) ? current.targets : []).filter(item => item !== diskTarget),
    }))
  }

  return <Panel className="p-6">
    <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">4. DISK TARGET & METRIC</p><p className="mt-0.5 text-xs text-muted-foreground">Choose where this Disk rule should apply.</p></div>
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block font-mono text-[11px] text-foreground">Disk Metric <span className="text-destructive">*</span></label>
        {metricState === "loading" && <p className="rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-muted-foreground">Loading metrics from Prometheus...</p>}
        {metricState === "error" && <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 font-mono text-xs text-destructive">Unable to load disk metrics: {metricError}</p>}
        {metricState === "empty" && <p className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2.5 font-mono text-xs text-warning">Prometheus returned no KAISP disk metrics.</p>}
        {metricState === "ready" && <SelectBox value={metric?.id || availableMetrics[0]?.id || ""} options={availableMetrics.map(item => ({ value: item.id, label: item.title }))} onChange={value => updateDiskMetric(setForm, value)} />}
      </div>
      <div>
        <label className="mb-1.5 block font-mono text-[11px] text-foreground">Target — Where should this Disk rule apply?</label>
        <SelectBox value={selectedTarget} options={TARGET_OPTIONS} onChange={chooseTarget} />
      </div>
      {validationError && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 font-mono text-xs text-destructive">{validationError}</p>}

      {selectedTarget === "process" && <div>
        <label className="mb-1.5 block font-mono text-[11px] text-foreground">Select Process</label>
        {processState === "loading" && <p className="rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-muted-foreground">Loading discovered processes...</p>}
        {processState === "error" && <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 font-mono text-xs text-destructive">Unable to load processes: {processError}</p>}
        {processState === "empty" && <p className="rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-muted-foreground">No processes are currently available from Prometheus.</p>}
        {processState === "ready" && <SelectBox value={form.processId || diskTarget?.pid || ""} options={[{ value: "", label: "Choose a process..." }, ...(selectedProcess && !processes.some(item => item.pid === selectedProcess.pid) ? [{ value: selectedProcess.pid, label: `${selectedProcess.name} (PID ${selectedProcess.pid})` }] : []), ...processes.map(item => ({ value: item.pid, label: `${item.name} (PID ${item.pid})` }))]} onChange={chooseProcess} />}
      </div>}

      {selectedTarget === "system" && <section className="space-y-3 rounded-md border border-emerald-700/20 bg-emerald-500/10 p-4">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300">Whole-System Disk Overview</h2><p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">KAISP is monitoring disk capacity and usage across the selected system. This rule will apply to the system-wide disk target.</p></div>
          <button type="button" onClick={removeTarget} className="shrink-0 rounded border border-border px-2.5 py-1.5 font-mono text-[10px] text-foreground hover:bg-card">Remove</button>
        </div>
        {systemState === "loading" && <p className="font-mono text-[11px] text-muted-foreground">Loading live disk details...</p>}
        {systemState === "error" && <p className="font-mono text-[11px] text-muted-foreground">Live disk details are unavailable from Prometheus.</p>}
        {systemState === "empty" && <p className="font-mono text-[11px] text-muted-foreground">No system disk capacity or usage metrics are currently available.</p>}
        {displayedSystemDetails.map(partition => <div key={`${partition.device}-${partition.mountpoint}`} className="space-y-2 rounded border border-emerald-700/10 bg-background/40 p-3">
          <p className="font-mono text-[11px] font-semibold text-foreground">{partition.mountpoint}</p>
          <DetailsValue label="Total capacity" value={partition.totalGb == null ? "Metric unavailable" : `${partition.totalGb.toFixed(2)} GB`} />
          <DetailsValue label="Used space" value={partition.totalGb == null || partition.usagePercent == null ? "Metric unavailable" : `${(partition.totalGb * partition.usagePercent / 100).toFixed(2)} GB (estimated from reported percentage)`} />
          <DetailsValue label="Free space" value={partition.totalGb == null || partition.usagePercent == null ? "Metric unavailable" : `${(partition.totalGb * (100 - partition.usagePercent) / 100).toFixed(2)} GB (estimated from reported percentage)`} />
          <DetailsValue label="Disk usage" value={formatNumber(partition.usagePercent, "%")} />
        </div>)}
        {systemDetails.length > 3 && <button type="button" onClick={() => setSystemPartitionsExpanded(expanded => !expanded)} className="rounded border border-emerald-700/20 px-3 py-1.5 font-mono text-[10px] font-semibold text-emerald-800 hover:bg-emerald-500/10 dark:text-emerald-300">
          {systemPartitionsExpanded ? "View Less" : "View More"}
        </button>}
        <div className="space-y-2 rounded border border-emerald-700/10 bg-background/40 p-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Processes on this system</p>
          {processState === "loading" && <p className="font-mono text-[11px] text-muted-foreground">Loading discovered processes...</p>}
          {processState === "error" && <p className="font-mono text-[11px] text-muted-foreground">Process details are unavailable from Prometheus.</p>}
          {processState === "empty" && <p className="font-mono text-[11px] text-muted-foreground">No processes are currently available.</p>}
          {processState === "ready" && displayedProcesses.map(process => <DetailsValue key={process.pid} label={`${process.name} (PID ${process.pid})`} value={process.status || "Status unavailable"} />)}
          {processState === "ready" && processes.length > 3 && <button type="button" onClick={() => setProcessListExpanded(expanded => !expanded)} className="rounded border border-emerald-700/20 px-3 py-1.5 font-mono text-[10px] font-semibold text-emerald-800 hover:bg-emerald-500/10 dark:text-emerald-300">
            {processListExpanded ? "View Less" : "View More"}
          </button>}
        </div>
        <button type="button" onClick={() => setShowMore(value => !value)} className="rounded border border-emerald-700/20 px-3 py-1.5 font-mono text-[10px] font-semibold text-emerald-800 hover:bg-emerald-500/10 dark:text-emerald-300">
          {showMore ? "View Less" : "View More"}
        </button>
        {showMore && <div className="space-y-2 rounded border border-emerald-700/10 bg-background/40 p-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Additional system disk metrics</p>
          {systemMoreState === "loading" && <p className="font-mono text-[11px] text-muted-foreground">Loading available disk metrics...</p>}
          {systemMoreState === "error" && <p className="font-mono text-[11px] text-muted-foreground">Additional disk metrics are unavailable from Prometheus.</p>}
          {systemMoreState === "empty" && <p className="font-mono text-[11px] text-muted-foreground">No additional disk metrics are currently available.</p>}
          {systemMoreDetails.map(row => <DetailsValue key={row.metric.id} label={row.metric.title} value={formatMetricValue(row.metric.id, row.value)} />)}
        </div>}
      </section>}

      {selectedTarget === "process" && selectedProcess && <section className="space-y-3 rounded-md border border-emerald-700/20 bg-emerald-500/10 p-4">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300">Process Disk Overview</h2><p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">KAISP is monitoring the selected process for disk activity. This rule will apply to this process only.</p></div>
          <button type="button" onClick={removeTarget} className="shrink-0 rounded border border-border px-2.5 py-1.5 font-mono text-[10px] text-foreground hover:bg-card">Remove</button>
        </div>
        <DetailsValue label="Process name" value={selectedProcess.name} />
        <DetailsValue label="Process ID" value={selectedProcess.pid} />
        {processDetailsState === "loading" && <p className="font-mono text-[11px] text-muted-foreground">Loading process disk activity...</p>}
        {processDetailsState === "error" && <p className="font-mono text-[11px] text-muted-foreground">Process disk activity is unavailable from Prometheus.</p>}
        {processDetailsState === "ready" && <>
          <DetailsValue label="Disk read bytes (cumulative)" value={formatBytes(processDetails?.readBytes)} />
          <DetailsValue label="Disk write bytes (cumulative)" value={formatBytes(processDetails?.writeBytes)} />
        </>}
        <button type="button" onClick={() => setShowMore(value => !value)} className="rounded border border-emerald-700/20 px-3 py-1.5 font-mono text-[10px] font-semibold text-emerald-800 hover:bg-emerald-500/10 dark:text-emerald-300">
          {showMore ? "View Less" : "View More"}
        </button>
        {showMore && <div className="space-y-2 rounded border border-emerald-700/10 bg-background/40 p-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Additional process details</p>
          <DetailsValue label="Process status" value={selectedProcess.status || "Metric unavailable"} />
          <DetailsValue label="Combined cumulative disk I/O" value={processDetails?.readBytes == null || processDetails?.writeBytes == null ? "Metric unavailable" : formatBytes(processDetails.readBytes + processDetails.writeBytes)} />
        </div>}
      </section>}
    </div>
  </Panel>
}
