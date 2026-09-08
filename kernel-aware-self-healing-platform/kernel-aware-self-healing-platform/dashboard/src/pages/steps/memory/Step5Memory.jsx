import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"

const RAM_METRICS   = ["system_memory_usage_percent", "system_memory_used_bytes", "system_memory_available_bytes", "system_memory_free_bytes", "system_memory_total_bytes"]
const SWAP_METRICS  = ["system_swap_usage_percent", "system_swap_used_bytes", "system_swap_free_bytes", "system_swap_total_bytes"]
const BYTE_METRICS  = new Set(["system_memory_used_bytes","system_memory_available_bytes","system_memory_free_bytes","system_memory_total_bytes","system_swap_used_bytes","system_swap_free_bytes","system_swap_total_bytes"])

const allMetrics = [...RAM_METRICS, ...SWAP_METRICS]

function unitFor(m) { return BYTE_METRICS.has(m) ? "bytes" : "%" }

export default function Step5Memory({ form, setForm }) {
  const category = form.memoryCategory || "ram"
  const availableMetrics = category === "swap" ? SWAP_METRICS : RAM_METRICS

  const [conditions, setConditions] = useState([
    { id: 1, metric: form.memoryMetric || availableMetrics[0], operator: "Greater Than (>)", threshold: "" }
  ])

  const addCondition = () => {
    setConditions(c => [...c, { id: Date.now(), metric: availableMetrics[0], operator: "Greater Than (>)", threshold: "" }])
  }

  const removeCondition = (id) => {
    if (conditions.length === 1) return
    setConditions(c => c.filter(x => x.id !== id))
  }

  const updateCondition = (id, field, value) => {
    setConditions(c => c.map(x => x.id === id ? { ...x, [field]: value } : x))
    if (conditions[0]?.id === id) {
      if (field === "threshold") setForm(f => ({ ...f, condThreshold: value }))
      if (field === "operator")  setForm(f => ({ ...f, condOperator: value }))
      if (field === "metric")    setForm(f => ({ ...f, memoryMetric: value, condMetric: value }))
    }
  }

  const firstUnit = unitFor(conditions[0]?.metric || "")

  return (
    <Panel className="p-6">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">5. Conditions (When)</p>
        <p className="text-xs text-muted-foreground mt-0.5">Define when this rule should trigger.</p>
      </div>
      <div className="space-y-5">

        {/* Condition rows */}
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center pb-1">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Metric</span>
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider w-44 text-center">Operator</span>
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider w-28 text-center">Threshold</span>
            <span className="w-8" />
          </div>

          {conditions.map((cond, i) => {
            const unit = unitFor(cond.metric)
            return (
              <div key={cond.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                <SelectBox
                  value={cond.metric}
                  options={availableMetrics}
                  onChange={v => updateCondition(cond.id, "metric", v)}
                />
                <SelectBox
                  value={cond.operator}
                  options={["Greater Than (>)", "Less Than (<)", "Equals (=)"]}
                  onChange={v => updateCondition(cond.id, "operator", v)}
                  className="w-44"
                />
                <div className="flex items-center gap-1.5 w-28">
                  <input
                    type="number"
                    value={cond.threshold}
                    onChange={e => updateCondition(cond.id, "threshold", e.target.value)}
                    className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
                  />
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">{unit}</span>
                </div>
                <button
                  onClick={() => removeCondition(cond.id)}
                  disabled={conditions.length === 1}
                  className="flex size-8 items-center justify-center rounded-md border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )
          })}

          <button
            onClick={addCondition}
            className="flex items-center gap-1.5 rounded border border-border bg-card px-3 py-1.5 font-mono text-[11px] text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <Plus className="size-3" /> Add Condition
          </button>
        </div>

        {/* Duration */}
        <div>
          <label className="block font-mono text-[11px] text-foreground mb-1.5">Duration (How long it must persist)</label>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="number"
              value={form.condDuration}
              onChange={e => setForm(f => ({ ...f, condDuration: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
            />
            <SelectBox value="Minutes" options={["Seconds", "Minutes", "Hours"]} onChange={() => {}} className="w-28" />
            <span className="font-mono text-[11px] text-foreground">Evaluation Frequency <span className="text-primary">*</span></span>
            <SelectBox
              value={form.condInterval || "Every 30 seconds"}
              options={["Every 15 seconds", "Every 30 seconds", "Every 1 minute", "Every 5 minutes"]}
              onChange={v => setForm(f => ({ ...f, condInterval: v }))}
              className="w-44"
            />
          </div>
        </div>

        {/* Occurrences */}
        <div>
          <label className="block font-mono text-[11px] text-foreground mb-1.5">Required Occurrences (within the window)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={form.condOccurrences}
              onChange={e => setForm(f => ({ ...f, condOccurrences: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
            />
            <span className="font-mono text-xs text-muted-foreground">out of</span>
            <input
              type="number"
              value={form.condOutOf}
              onChange={e => setForm(f => ({ ...f, condOutOf: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary mb-1 font-bold">Condition Preview</p>
          <p className="font-mono text-xs text-foreground">
            {conditions[0]?.metric || "—"} &gt; {conditions[0]?.threshold || "—"} {firstUnit} for {form.condDuration || "—"} minutes
          </p>
          <p className="font-mono text-[10px] text-muted-foreground mt-1">
            Prometheus: <span className="text-primary">{conditions[0]?.metric}</span>
          </p>
        </div>
      </div>
    </Panel>
  )
}
