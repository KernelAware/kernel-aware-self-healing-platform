import { Panel } from "@/components/kit"
import { SelectBox } from "./wizardComponents"

export default function Step5({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">5. Conditions (When)</p><p className="text-xs text-muted-foreground mt-0.5">Define when this rule should trigger.</p></div>
      <div className="space-y-5">
        <div>
          <label className="block font-mono text-[11px] text-foreground mb-2">Metric · Operator · Threshold</label>
          <div className="flex items-center gap-2 flex-wrap">
            <SelectBox value={form.condMetric} options={["CPU Usage (%)","Memory Usage (%)","Disk Usage (%)"]} onChange={v => setForm(f => ({ ...f, condMetric: v }))} className="flex-1 min-w-[140px]" />
            <SelectBox value={form.condOperator} options={["Greater Than (>)","Less Than (<)","Equals (=)"]} onChange={v => setForm(f => ({ ...f, condOperator: v }))} className="w-44" />
            <input type="number" value={form.condThreshold} onChange={e => setForm(f => ({ ...f, condThreshold: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
            <span className="font-mono text-xs text-muted-foreground">%</span>
          </div>
        </div>
        <div>
          <label className="block font-mono text-[11px] text-foreground mb-1.5">Duration (How long must persist)</label>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="number" value={form.condDuration} onChange={e => setForm(f => ({ ...f, condDuration: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
            <SelectBox value="Minutes" options={["Seconds","Minutes","Hours"]} onChange={() => {}} className="w-28" />
            <SelectBox value={form.condInterval} options={["Every 30 seconds","Every 1 minute","Every 5 minutes"]} onChange={v => setForm(f => ({ ...f, condInterval: v }))} className="w-40" />
          </div>
        </div>
        <div>
          <label className="block font-mono text-[11px] text-foreground mb-1.5">Required Occurrences (within the window)</label>
          <div className="flex items-center gap-2">
            <input type="number" value={form.condOccurrences} onChange={e => setForm(f => ({ ...f, condOccurrences: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
            <span className="font-mono text-xs text-muted-foreground">out of</span>
            <input type="number" value={form.condOutOf} onChange={e => setForm(f => ({ ...f, condOutOf: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
          </div>
        </div>
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary mb-1 font-bold">Condition Preview</p>
          <p className="font-mono text-xs text-foreground">CPU Usage &gt; {form.condThreshold}% for {form.condDuration} minutes</p>
        </div>
      </div>
    </Panel>
  )
}
