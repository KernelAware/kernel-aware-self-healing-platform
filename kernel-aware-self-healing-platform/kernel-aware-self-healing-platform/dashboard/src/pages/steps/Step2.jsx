import { X, ChevronDown } from "lucide-react"
import { Panel } from "@/components/kit"
import { cn } from "@/utils/cn"
import { SelectBox, Radio } from "./wizardComponents"

export default function Step2({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">2. Scope (Target / Where)</p><p className="text-xs text-muted-foreground mt-0.5">Where should this rule apply?</p></div>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block font-mono text-[11px] text-foreground mb-1.5">Environment <span className="text-destructive">*</span></label><SelectBox value={form.environment} options={["Production","Staging","Development"]} onChange={v => setForm(f => ({ ...f, environment: v }))} /></div>
          <div><label className="block font-mono text-[11px] text-foreground mb-1.5">Region <span className="text-destructive">*</span></label><SelectBox value={form.region} options={["US-East-1","EU-Central-1","AP-Southeast-1"]} onChange={v => setForm(f => ({ ...f, region: v }))} /></div>
        </div>
        <div>
          <label className="block font-mono text-[11px] text-foreground mb-3">Apply To</label>
          <div className="grid grid-cols-3 gap-3">
            {[{ id:"all-hosts",label:"All hosts in environment",desc:"Apply rule to all hosts" },{ id:"host-groups",label:"Host groups",desc:"Select one or more groups" },{ id:"specific-hosts",label:"Specific hosts",desc:"Select individual hosts" }].map(opt => (
              <label key={opt.id} onClick={() => setForm(f => ({ ...f, applyTo: opt.id }))}
                className={cn("flex flex-col gap-1.5 rounded-md border p-3 cursor-pointer transition-colors", form.applyTo === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
                <div className="flex items-center justify-between"><span className="font-mono text-xs font-semibold text-foreground">{opt.label}</span><Radio checked={form.applyTo === opt.id} /></div>
                <p className="font-mono text-[10px] text-muted-foreground">{opt.desc}</p>
              </label>
            ))}
          </div>
        </div>
        {form.applyTo === "host-groups" && (
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Host Groups <span className="text-destructive">*</span></label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 min-h-[42px]">
              {form.hostGroups.map(g => (
                <span key={g} className="inline-flex items-center gap-1 rounded bg-secondary/70 border border-border px-2 py-0.5 font-mono text-[11px] text-foreground">
                  {g}<button onClick={() => setForm(f => ({ ...f, hostGroups: f.hostGroups.filter(x => x !== g) }))} className="text-muted-foreground hover:text-foreground cursor-pointer ml-0.5"><X className="size-2.5" /></button>
                </span>
              ))}
              <ChevronDown className="ml-auto size-3.5 text-muted-foreground shrink-0" />
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}
