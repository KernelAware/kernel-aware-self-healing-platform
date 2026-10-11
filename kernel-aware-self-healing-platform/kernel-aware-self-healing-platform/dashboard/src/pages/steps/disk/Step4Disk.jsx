import { useEffect, useState } from "react"
import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"
import { queryPrometheusMetricNames } from "@/services/api"
import { DISK_METRICS, DISK_TARGET_TYPES, diskMetricsFromPrometheus, updateDisk, updateDiskMetric, updateDiskTarget } from "./diskHelpers"

export default function Step4Disk({ form, setForm }) {
  const [availableMetrics, setAvailableMetrics] = useState([])
  const [metricState, setMetricState] = useState("loading")
  const [metricError, setMetricError] = useState("")
  const metric = availableMetrics.find(item => item.id === form.metric) || DISK_METRICS.find(item => item.id === form.metric)
  const targetType = form.targetType === "Partition (Mount Point)" ? "Filesystem / Mount Point" : (form.targetType || DISK_TARGET_TYPES[0])

  useEffect(() => {
    let active = true
    queryPrometheusMetricNames()
      .then(names => {
        if (!active) return
        const metrics = diskMetricsFromPrometheus(names)
        setAvailableMetrics(metrics)
        setMetricState(metrics.length ? "ready" : "empty")
        setMetricError("")
        const selected = metrics.find(item => item.id === form.metric) || metrics.find(item => item.id === "disk_usage_percent")
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
    const normalizedTarget = form.targetType === "Partition (Mount Point)" ? "Filesystem / Mount Point" : (form.targetType || "Filesystem / Mount Point")
    const normalizedMetric = availableMetrics.find(item => item.id === form.metric)?.id || availableMetrics[0]?.id || ""
    const normalizedMount = form.mountPoint === "/ (Root)" ? "/" : (form.mountPoint || "/")
    if (metricState === "ready" && (form.targetType !== normalizedTarget || form.metric !== normalizedMetric || form.mountPoint !== normalizedMount || !form.host)) {
      updateDiskTarget(setForm, {
        metric: normalizedMetric,
        condMetric: availableMetrics.some(item => item.id === form.condMetric) ? form.condMetric : normalizedMetric,
        recoveryMetric: availableMetrics.some(item => item.id === form.recoveryMetric) ? form.recoveryMetric : normalizedMetric,
        targetType: normalizedTarget,
        host: form.host || "web-01.prod.local",
        mountPoint: normalizedMount,
        aggregation: form.aggregation?.includes("(") ? "Average" : (form.aggregation || "Average"),
      })
    }
  }, [availableMetrics, form.targetType, form.metric, form.mountPoint, form.host, form.condMetric, form.recoveryMetric, form.aggregation, metricState, setForm])

  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">4. DISK TARGET & METRIC</p><p className="text-xs text-muted-foreground mt-0.5">Select the disk metric and target for this rule.</p></div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Disk Metric <span className="text-destructive">*</span></label>
            {metricState === "loading" && <p className="rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-muted-foreground">Loading metrics from Prometheus...</p>}
            {metricState === "error" && <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 font-mono text-xs text-destructive">Unable to load disk metrics: {metricError}</p>}
            {metricState === "empty" && <p className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2.5 font-mono text-xs text-warning">Prometheus returned no KAISP disk metrics.</p>}
            {metricState === "ready" && <SelectBox value={metric?.id || availableMetrics[0]?.id || ""} options={availableMetrics.map(item => ({ value: item.id, label: item.title }))} onChange={v => updateDiskMetric(setForm, v)} />}
          </div>
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Target Type <span className="text-destructive">*</span></label>
            <SelectBox value={targetType} options={DISK_TARGET_TYPES} onChange={v => updateDiskTarget(setForm, { targetType: v })} />
          </div>
          <label className="block font-mono text-[11px] text-foreground">Host <span className="text-destructive">*</span>
            <input value={form.host || ""} onChange={e => updateDiskTarget(setForm, { host: e.target.value })} placeholder="web-01.prod.local" className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none" />
          </label>
          {targetType === "Disk / Device" && <label className="block font-mono text-[11px] text-foreground">Disk Device <span className="text-destructive">*</span>
            <input value={form.device || ""} onChange={e => updateDiskTarget(setForm, { device: e.target.value })} placeholder="/dev/sda" className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none" />
          </label>}
          {targetType === "Filesystem / Mount Point" && <label className="block font-mono text-[11px] text-foreground">Mount Point <span className="text-destructive">*</span>
            <input value={form.mountPoint || ""} onChange={e => updateDiskTarget(setForm, { mountPoint: e.target.value })} placeholder="/data" className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none" />
          </label>}
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Aggregation <span className="text-destructive">*</span></label>
            <SelectBox value={form.aggregation || "Average"} options={["Average","Maximum","Minimum","Sum"]} onChange={v => updateDisk(setForm, { aggregation: v })} />
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">How values are aggregated for evaluation.</p>
          </div>
        </div>
        <div className="col-span-1">
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4 h-full space-y-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">ABOUT {metric?.title?.toUpperCase() || "DISK METRIC"}</p>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              {metric?.description || "Select a metric after Prometheus metrics are available."}
            </p>
            <div className="border-t border-primary/10 pt-3 space-y-2">
              <div>
                <p className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider mb-0.5">Formula</p>
                <p className="font-mono text-[11px] text-muted-foreground">Prometheus name: {metric?.id || "Not available"}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider mb-0.5">Unit</p>
                <p className="font-mono text-[11px] text-muted-foreground">{metric?.unit || "Not available"}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider mb-0.5">Labels</p>
                <div className="flex flex-wrap gap-1 mt-1">
                    {(metric?.labels || []).map(l => (
                    <span key={l} className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 font-mono text-[10px] text-primary">{l}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}
