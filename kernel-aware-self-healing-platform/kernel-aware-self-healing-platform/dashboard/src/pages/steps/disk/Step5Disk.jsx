import { useEffect } from "react"
import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"
import { DISK_METRICS, OPERATORS, updateDisk } from "./diskHelpers"

export default function Step5Disk({ form, setForm }) {
  const metric = DISK_METRICS.find(item => item.id === form.metric)
  const diskTarget = form.targets?.find(item => ["host", "disk", "filesystem", "process"].includes(item.type))
  const targetMetric = diskTarget?.metrics?.[0]
  const condition = targetMetric?.conditions?.[0]
  const duration = form.condDuration || "5"
  const target = diskTarget?.type === "process"
    ? `${diskTarget.processName || form.processName || "Process"} (PID ${diskTarget.pid || form.processId || "?"})`
    : [form.mountPoint || form.device, form.host].filter(Boolean).join(" on ")
  const operator = form.condOperator || condition?.operator || "Greater Than (>)"

  const updateCondition = (field, value) => setForm(current => {
    const targets = Array.isArray(current.targets) ? current.targets : []
    const metricId = current.metric || ""
    const conditionValues = {
      metric: metricId,
      operator: current.condOperator || "Greater Than (>)",
      threshold: current.condThreshold || "90",
      duration: current.condDuration || "5",
      durationUnit: current.condDurationUnit || "Minutes",
      [field]: value,
    }
    return {
      ...current,
      [field === "operator" ? "condOperator" : field === "threshold" ? "condThreshold" : field === "duration" ? "condDuration" : "condDurationUnit"]: value,
      targets: targets.map(item => {
        if (!["host", "disk", "filesystem", "process"].includes(item.type)) return item
        const metrics = Array.isArray(item.metrics) ? item.metrics : []
        const metricIndex = metrics.findIndex(metricItem => metricItem.name === metricId)
        const selectedMetricIndex = metricIndex >= 0 ? metricIndex : 0
        const selectedMetric = metrics[selectedMetricIndex] || { name: metricId, conditions: [] }
        const conditions = Array.isArray(selectedMetric.conditions) ? selectedMetric.conditions : []
        const existingCondition = conditions[0] || {}
        return {
          ...item,
          metrics: metrics.length > 0
            ? metrics.map((metricItem, index) => index !== selectedMetricIndex ? metricItem : {
              ...metricItem,
              name: metricId,
              conditions: [{ ...existingCondition, ...conditionValues }],
            })
            : [{ name: metricId, conditions: [{ ...conditionValues }] }],
        }
      }),
    }
  })

  useEffect(() => {
    const diskTargetForCondition = form.targets?.find(item => ["host", "disk", "filesystem", "process"].includes(item.type))
    const nestedCondition = diskTargetForCondition?.metrics?.[0]?.conditions?.[0]
    const baseConditionComplete = form.condOperator && form.condThreshold && form.condDuration && form.condDurationUnit
    if ((!form.metric || !diskTargetForCondition) && baseConditionComplete) return
    if (form.metric && form.condMetric === form.metric && baseConditionComplete && nestedCondition?.metric === form.metric && nestedCondition?.operator && nestedCondition?.threshold && nestedCondition?.duration && nestedCondition?.durationUnit) return
    setForm(current => {
      const condMetric = current.metric || current.condMetric || ""
      const condOperator = current.condOperator || "Greater Than (>)"
      const condThreshold = current.condThreshold || "90"
      const condDuration = current.condDuration || "5"
      const condDurationUnit = current.condDurationUnit || "Minutes"
      const targets = Array.isArray(current.targets) ? current.targets : []
      return {
      ...current,
      condMetric,
      condOperator,
      condThreshold,
      condDuration,
      condDurationUnit,
      condInterval: current.condInterval || "Every 30 seconds",
      condOccurrences: current.condOccurrences || "8",
      condOutOf: current.condOutOf || "10",
      targets: targets.map(item => {
        if (!["host", "disk", "filesystem", "process"].includes(item.type)) return item
        if (!current.metric) return item
        const metrics = Array.isArray(item.metrics) ? item.metrics : []
        const selectedMetric = metrics[0] || { name: condMetric, conditions: [] }
        const existingCondition = selectedMetric.conditions?.[0] || {}
        return {
          ...item,
          metrics: [{
            ...selectedMetric,
            name: condMetric,
            conditions: [{
              ...existingCondition,
              metric: condMetric,
              operator: condOperator,
              threshold: condThreshold,
              duration: condDuration,
              durationUnit: condDurationUnit,
            }],
          }],
        }
      }),
    }
    })
  }, [form.condMetric, form.metric, form.condOperator, form.condThreshold, form.condDuration, setForm])

  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">5. DISK CONDITIONS (WHEN)</p><p className="text-xs text-muted-foreground mt-0.5">Define when this disk rule should trigger.</p></div>
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md border border-border bg-card px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Selected Disk Metric</p>
            {metric ? <><p className="mt-1 font-mono text-xs font-semibold text-foreground">{metric.title}</p><p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{metric.id}</p></> : <p role="alert" className="mt-1 font-mono text-xs text-destructive">No Disk metric is selected in Step 4.</p>}
          </div>
          <SelectBox value={operator} options={OPERATORS} onChange={v => updateCondition("operator", v)} />
          <div className="flex items-center gap-2"><input type="number" value={form.condThreshold || condition?.threshold || "90"} onChange={e => updateCondition("threshold", e.target.value)} className="w-full rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none" placeholder="Threshold" /><span className="font-mono text-xs text-muted-foreground">{metric?.unit || "—"}</span></div>
        </div>

        <div>
          <label className="block font-mono text-[11px] text-foreground mb-1.5">Duration (How long it must persist)</label>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="number" value={duration} onChange={e => updateCondition("duration", e.target.value)} className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
            <SelectBox value={form.condDurationUnit || "Minutes"} options={["Seconds","Minutes","Hours"]} onChange={v => updateCondition("durationUnit", v)} className="w-28" />
            <span className="font-mono text-[11px] text-foreground">Evaluation Frequency <span className="text-primary">*</span></span>
            <SelectBox value={form.condInterval || "Every 30 seconds"} options={["Every 30 seconds","Every 1 minute","Every 5 minutes"]} onChange={v => updateDisk(setForm, { condInterval: v })} className="w-40" />
          </div>
        </div>

        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary mb-1 font-bold">Condition Preview</p>
          <p className="font-mono text-xs text-foreground">
            {target ? `${target}: ` : ""}{metric?.title || "No Disk metric selected"} {operator} {form.condThreshold || "—"}{metric?.unit || ""} for {duration || "—"} {(form.condDurationUnit || "Minutes").toLowerCase()}
          </p>
        </div>
      </div>
    </Panel>
  )
}
