import { Panel } from "@/components/kit"
import { cn } from "@/utils/cn"
import { Radio } from "../wizardComponents"

const SEVERITIES = [
  { id: "Warning", desc: "Disk condition requires attention.", tone: "text-warning", border: "border-warning", bg: "bg-warning/10" },
  { id: "High", desc: "Disk resource usage or I/O performance may affect system operation.", tone: "text-destructive", border: "border-destructive", bg: "bg-destructive/10" },
  { id: "Critical", desc: "Severe disk condition that may cause service or system impact.", tone: "text-red-400", border: "border-red-400", bg: "bg-red-900/20" },
]

export default function Step6Disk({ form, setForm }) {
  return <Panel className="p-6">
    <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">6. DISK SEVERITY</p><p className="text-xs text-muted-foreground mt-0.5">Classify the impact of this disk condition.</p></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {SEVERITIES.map(severity => <label key={severity.id} onClick={() => setForm(f => ({ ...f, severity: severity.id }))} className={cn("flex flex-col gap-3 rounded-lg border-2 p-4 cursor-pointer", form.severity === severity.id ? `${severity.border} ${severity.bg}` : "border-border hover:border-primary/30")}>
        <div className="flex justify-between"><span className={cn("font-mono text-sm font-bold", severity.tone)}>{severity.id}</span><Radio checked={form.severity === severity.id} /></div><p className="font-mono text-[11px] text-foreground leading-relaxed">{severity.desc}</p>
      </label>)}
    </div>
  </Panel>
}
