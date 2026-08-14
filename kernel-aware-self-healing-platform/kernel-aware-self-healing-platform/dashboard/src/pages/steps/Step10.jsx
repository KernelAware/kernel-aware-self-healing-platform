import { Info } from "lucide-react"
import { Panel } from "@/components/kit"
import { SelectBox } from "./wizardComponents"

export default function Step10({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">10. Verification & Recovery</p><p className="text-xs text-muted-foreground mt-0.5">How recovery is detected for this rule.</p></div>
      <div className="space-y-5">
        <div className="flex gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
          <Info className="size-4 text-primary shrink-0 mt-0.5" />
          <p className="font-mono text-[11px] text-foreground">Verification is not required for Alert-only actions.<br />Set recovery condition to auto-resolve incidents.</p>
        </div>
        <div>
          <label className="block font-mono text-xs font-semibold text-foreground mb-2">Recovery Condition</label>
          <div className="flex items-center gap-2 flex-wrap">
            <SelectBox value="CPU Usage (%)" options={["CPU Usage (%)","Memory Usage (%)"]} onChange={() => {}} className="flex-1 min-w-[140px]" />
            <SelectBox value="Less Than (<)" options={["Less Than (<)","Greater Than (>)"]} onChange={() => {}} className="w-36" />
            <input type="number" value={form.recoveryThreshold} onChange={e => setForm(f => ({ ...f, recoveryThreshold: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
            <span className="font-mono text-xs text-muted-foreground">%</span>
          </div>
        </div>
        <div>
          <label className="block font-mono text-xs font-semibold text-foreground mb-2">Duration</label>
          <div className="flex items-center gap-2">
            <input type="number" value={form.recoveryDuration} onChange={e => setForm(f => ({ ...f, recoveryDuration: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
            <SelectBox value="Minutes" options={["Seconds","Minutes"]} onChange={() => {}} className="w-28" />
          </div>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">Condition must be true for the duration to be marked as recovered.</p>
        </div>
      </div>
    </Panel>
  )
}
