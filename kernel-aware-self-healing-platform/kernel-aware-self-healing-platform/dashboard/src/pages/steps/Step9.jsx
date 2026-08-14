import { Info } from "lucide-react"
import { Panel } from "@/components/kit"
import { SelectBox, Checkbox } from "./wizardComponents"

export default function Step9({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">9. Retry & Cooldown</p><p className="text-xs text-muted-foreground mt-0.5">Configure recovery and cooldown behavior.</p></div>
      <div className="space-y-5">
        <div className="flex gap-2 rounded-md border border-primary/20 bg-primary/5 p-3"><Info className="size-4 text-primary shrink-0 mt-0.5" /><p className="font-mono text-[11px] text-foreground">Retry is not applicable for Alert-only actions.</p></div>
        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-3">Cooldown</p>
          <div className="space-y-3">
            <div>
              <label className="block font-mono text-[11px] text-foreground mb-1.5">Cooldown Period</label>
              <div className="flex items-center gap-2">
                <input type="number" value={form.cooldownPeriod} onChange={e => setForm(f => ({ ...f, cooldownPeriod: e.target.value }))}
                  className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
                <SelectBox value="Minutes" options={["Minutes","Hours"]} onChange={() => {}} className="w-28" />
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">Prevent duplicate incidents within this period.</p>
            </div>
            <div className="space-y-2 pt-1">
              {[{ key:"suppressDups", label:"Suppress duplicate incidents during cooldown" },{ key:"enableDedup", label:"Enable deduplication during cooldown" }].map(opt => (
                <label key={opt.key} className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox checked={form[opt.key]} onClick={() => setForm(f => ({ ...f, [opt.key]: !f[opt.key] }))} />
                  <span className="font-mono text-xs text-foreground">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}
