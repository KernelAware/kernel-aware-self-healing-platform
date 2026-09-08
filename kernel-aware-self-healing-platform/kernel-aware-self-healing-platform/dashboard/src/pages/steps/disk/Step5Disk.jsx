import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"

export default function Step5Disk({ form, setForm }) {
  const [conditions, setConditions] = useState([
    { id: 1, metric: form.condMetric || "Disk Usage %", operator: form.condOperator || "Greater Than (>)", threshold: form.condThreshold || "" }
  ])

  const addCondition = () => {
    setConditions(c => [...c, { id: Date.now(), metric: "Disk Usage %", operator: "Greater Than (>)", threshold: "" }])
  }

  const removeCondition = (id) => {
    setConditions(c => c.filter(x => x.id !== id))
  }

  const updateCondition = (id, field, value) => {
    setConditions(c => c.map(x => x.id === id ? { ...x, [field]: value } : x))
    if (conditions[0]?.id === id) {
      if (field === "metric") setForm(f => ({ ...f, condMetric: value }))
      if (field === "operator") setForm(f => ({ ...f, condOperator: value }))
      if (field === "threshold") setForm(f => ({ ...f, condThreshold: value }))
    }
  }

  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">5. Conditions (When)</p><p className="text-xs text-muted-foreground mt-0.5">Define when this rule should trigger.</p></div>
      <div className="space-y-5">
        <div className="space-y-3">
          {conditions.map((cond, i) => (
            <div key={cond.id} className="flex items-center gap-2 flex-wrap">
              {i === 0 && conditions.length === 1 ? null : (
                <span className="font-mono text-[10px] text-muted-foreground w-6 shrink-0">AND</span>
              )}
              <SelectBox
                value={cond.metric}
                options={["Disk Usage %","Disk Free (GB)","Disk Read Bytes/s","Disk Write Bytes/s","Inode Usage %"]}
                onChange={v => updateCondition(cond.id, "metric", v)}
                className="flex-1 min-w-[140px]"
              />
              <SelectBox
                value={cond.operator}
                options={["Greater Than (>)","Less Than (<)","Equals (=)"]}
                onChange={v => updateCondition(cond.id, "operator", v)}
                className="w-44"
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={cond.threshold}
                  onChange={e => updateCondition(cond.id, "threshold", e.target.value)}
                  className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
                />
                <span className="font-mono text-xs text-muted-foreground">%</span>
              </div>
              {conditions.length > 1 && (
                <button
                  onClick={() => removeCondition(cond.id)}
                  className="flex size-8 items-center justify-center rounded-md border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addCondition}
            className="flex items-center gap-1.5 rounded border border-border bg-card px-3 py-1.5 font-mono text-[11px] text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <Plus className="size-3" /> Add Condition
          </button>
        </div>

        <div>
          <label className="block font-mono text-[11px] text-foreground mb-1.5">Duration (How long it must persist)</label>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="number"
              value={form.condDuration}
              onChange={e => setForm(f => ({ ...f, condDuration: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
            />
            <SelectBox value="Minutes" options={["Seconds","Minutes","Hours"]} onChange={() => {}} className="w-28" />
            <span className="font-mono text-[11px] text-foreground">Evaluation Frequency <span className="text-primary">*</span></span>
            <SelectBox value={form.condInterval} options={["Every 30 seconds","Every 1 minute","Every 5 minutes"]} onChange={v => setForm(f => ({ ...f, condInterval: v }))} className="w-40" />
          </div>
        </div>

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

        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary mb-1 font-bold">Condition Preview</p>
          <p className="font-mono text-xs text-foreground">
            Disk Usage &gt; {conditions[0]?.threshold || "—"}% for {form.condDuration || "—"} minutes
          </p>
        </div>
      </div>
    </Panel>
  )
}
