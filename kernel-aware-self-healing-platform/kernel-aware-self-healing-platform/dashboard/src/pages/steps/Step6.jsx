import { Panel } from "@/components/kit"
import { cn } from "@/utils/cn"
import { Radio } from "./wizardComponents"

export default function Step6({ form, setForm }) {
  const sevs = [
    { id:"warning",label:"Warning",emoji:"⚠️",desc:"Needs attention",note:"Recommended for non-urgent issues.",ab:"border-warning",bb:"border-warning/40",abg:"bg-warning/10",bbg:"bg-warning/5",tc:"text-warning" },
    { id:"high",label:"High",emoji:"🔴",desc:"Affects system performance.",note:"Impacts system performance.",ab:"border-destructive",bb:"border-destructive/40",abg:"bg-destructive/10",bbg:"bg-destructive/5",tc:"text-destructive" },
    { id:"critical",label:"Critical",emoji:"💥",desc:"Service impact / Down.",note:"May cause service interruption.",ab:"border-red-400",bb:"border-red-400/40",abg:"bg-red-900/20",bbg:"bg-red-900/10",tc:"text-red-400" },
  ]
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">6. Severity</p><p className="text-xs text-muted-foreground mt-0.5">How severe is this condition?</p></div>
      <div className="grid grid-cols-3 gap-4">
        {sevs.map(s => (
          <label key={s.id} onClick={() => setForm(f => ({ ...f, severity: s.id }))}
            className={cn("flex flex-col rounded-lg border-2 p-4 cursor-pointer transition-all", form.severity === s.id ? s.ab+" "+s.abg : s.bb+" "+s.bbg)}>
            <div className="flex items-center justify-between mb-3"><span className="text-2xl">{s.emoji}</span><Radio checked={form.severity === s.id} /></div>
            <p className={cn("font-mono text-sm font-bold", s.tc)}>{s.label}</p>
            <p className="font-mono text-[11px] text-foreground mt-1">{s.desc}</p>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">{s.note}</p>
          </label>
        ))}
      </div>
      <div className="mt-5 rounded-md border border-border bg-secondary/10 p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-bold">Impact Preview</p>
        <p className="font-mono text-xs text-muted-foreground">This severity will create an incident and notify the appropriate teams.</p>
      </div>
    </Panel>
  )
}
