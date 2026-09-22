import { useEffect } from "react"
import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"
import { DISK_METRICS, OPERATORS, updateDisk } from "./diskHelpers"

export default function Step5Disk({ form, setForm }) {
  const metric = DISK_METRICS.find(item => item.id === (form.condMetric || form.metric)) || DISK_METRICS[0]
  const duration = form.condDuration || "5"
  const target = [form.mountPoint || form.device, form.host].filter(Boolean).join(" on ")
  const operator = form.condOperator || "Greater Than (>)"

  useEffect(() => {
    if (form.condMetric && form.condOperator && form.condThreshold && form.condDuration) return
    setForm(current => ({
      ...current,
      condMetric: current.condMetric || current.metric || "Disk Usage (%)",
      condOperator: current.condOperator || "Greater Than (>)",
      condThreshold: current.condThreshold || "90",
      condDuration: current.condDuration || "5",
      condDurationUnit: current.condDurationUnit || "Minutes",
      condInterval: current.condInterval || "Every 30 seconds",
      condOccurrences: current.condOccurrences || "8",
      condOutOf: current.condOutOf || "10",
    }))
  }, [form.condMetric, form.metric, form.condOperator, form.condThreshold, form.condDuration, setForm])

  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">5. DISK CONDITIONS (WHEN)</p><p className="text-xs text-muted-foreground mt-0.5">Define when this disk rule should trigger.</p></div>
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <SelectBox value={metric.id} options={DISK_METRICS.map(item => item.id)} onChange={v => updateDisk(setForm, { condMetric: v })} />
          <SelectBox value={operator} options={OPERATORS} onChange={v => updateDisk(setForm, { condOperator: v })} />
          <div className="flex items-center gap-2"><input type="number" value={form.condThreshold || "90"} onChange={e => updateDisk(setForm, { condThreshold: e.target.value })} className="w-full rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none" placeholder="Threshold" /><span className="font-mono text-xs text-muted-foreground">{metric.unit}</span></div>
        </div>

        <div>
          <label className="block font-mono text-[11px] text-foreground mb-1.5">Duration (How long it must persist)</label>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="number" value={duration} onChange={e => updateDisk(setForm, { condDuration: e.target.value })} className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
            <SelectBox value={form.condDurationUnit || "Minutes"} options={["Seconds","Minutes","Hours"]} onChange={v => updateDisk(setForm, { condDurationUnit: v })} className="w-28" />
            <span className="font-mono text-[11px] text-foreground">Evaluation Frequency <span className="text-primary">*</span></span>
            <SelectBox value={form.condInterval || "Every 30 seconds"} options={["Every 30 seconds","Every 1 minute","Every 5 minutes"]} onChange={v => updateDisk(setForm, { condInterval: v })} className="w-40" />
          </div>
        </div>

        <div>
          <label className="block font-mono text-[11px] text-foreground mb-1.5">Required Occurrences (within the window)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={form.condOccurrences || "8"}
              onChange={e => updateDisk(setForm, { condOccurrences: e.target.value })}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
            />
            <span className="font-mono text-xs text-muted-foreground">out of</span>
            <input
              type="number"
              value={form.condOutOf || "10"}
              onChange={e => updateDisk(setForm, { condOutOf: e.target.value })}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
            />
          </div>
        </div>

        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary mb-1 font-bold">Condition Preview</p>
          <p className="font-mono text-xs text-foreground">
            {target ? `${target}: ` : ""}{metric.title} {operator} {form.condThreshold || "—"}{metric.unit} for {duration || "—"} {(form.condDurationUnit || "Minutes").toLowerCase()}
          </p>
        </div>
      </div>
    </Panel>
  )
}
