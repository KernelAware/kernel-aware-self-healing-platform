import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"
import { Plus } from "lucide-react"

export default function Step5Network({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">5. Conditions (When)</p><p className="text-xs text-muted-foreground mt-0.5">Define when this rule should trigger.</p></div>
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="flex-1"><label className="block font-mono text-[11px] text-foreground">Metric</label></div>
            <div className="w-44"><label className="block font-mono text-[11px] text-foreground">Operator</label></div>
            <div className="w-32"><label className="block font-mono text-[11px] text-foreground">Threshold</label></div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SelectBox value={form.condMetric} options={["Error Rate (errors/sec)", "Packet Loss (%)", "Throughput (Mbps)"]} onChange={v => setForm(f => ({ ...f, condMetric: v }))} className="flex-1 min-w-[140px]" />
            <SelectBox value={form.condOperator} options={["Greater Than (>)","Less Than (<)","Equals (=)"]} onChange={v => setForm(f => ({ ...f, condOperator: v }))} className="w-44" />
            <div className="flex items-center gap-2 w-32">
              <input type="number" value={form.condThreshold} onChange={e => setForm(f => ({ ...f, condThreshold: e.target.value }))}
                className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
              <span className="font-mono text-xs text-muted-foreground">errors/sec</span>
            </div>
          </div>
          <button className="mt-3 flex items-center gap-1.5 rounded border border-border bg-card px-3 py-1.5 font-mono text-[11px] text-foreground hover:bg-secondary transition-colors cursor-pointer"><Plus className="size-3" /> Add Condition</button>
        </div>
        <div>
          <label className="block font-mono text-[11px] text-foreground mb-1.5">Duration (How long it must persist)</label>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="number" value={form.condDuration} onChange={e => setForm(f => ({ ...f, condDuration: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
            <SelectBox value="Minutes" options={["Seconds","Minutes","Hours"]} onChange={() => {}} className="w-28" />
            <div className="w-4"></div>
            <span className="font-mono text-[11px] text-foreground">Evaluation Frequency <span className="text-primary">*</span></span>
            <SelectBox value={form.condInterval} options={["Every 20 seconds", "Every 30 seconds", "Every 1 minute"]} onChange={v => setForm(f => ({ ...f, condInterval: v }))} className="w-40" />
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
          <p className="font-mono text-xs text-foreground">
            Incoming Error Rate &gt; {form.condThreshold} errors/sec for {form.condDuration} minutes
          </p>
        </div>
      </div>
    </Panel>
  )
}
