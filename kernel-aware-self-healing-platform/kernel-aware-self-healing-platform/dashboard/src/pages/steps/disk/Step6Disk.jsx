import { Panel } from "@/components/kit"
import { cn } from "@/utils/cn"
import { Radio } from "../wizardComponents"
import { updateDisk } from "./diskHelpers"

const SEVERITIES = [
  { id: "warning", label: "Warning", desc: "Disk usage is approaching the configured limit.", note: "Recommended for early intervention.", className: "text-warning", border: "border-warning" },
  { id: "high", label: "High", desc: "Disk capacity or I/O performance is significantly affecting the system.", note: "Impacts system performance.", className: "text-destructive", border: "border-destructive" },
  { id: "critical", label: "Critical", desc: "Disk capacity is critically low or I/O performance is severely degraded.", note: "May cause service interruption.", className: "text-red-400", border: "border-red-400" },
]

export default function Step6Disk({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">6. DISK SEVERITY</p><p className="text-xs text-muted-foreground mt-0.5">Set the impact level for this disk condition.</p></div>
      <div className="grid grid-cols-3 gap-4">
        {SEVERITIES.map(severity => <label key={severity.id} onClick={() => updateDisk(setForm, { severity: severity.id })} className={cn("flex flex-col rounded-lg border-2 p-4 cursor-pointer transition-all", form.severity === severity.id ? `${severity.border} bg-primary/5` : "border-border bg-secondary/5 hover:border-primary/30")}>
          <div className="flex items-center justify-between mb-3"><span className={cn("text-2xl", severity.className)}>●</span><Radio checked={form.severity === severity.id} /></div>
          <p className={cn("font-mono text-sm font-bold", severity.className)}>{severity.label}</p><p className="font-mono text-[11px] text-foreground mt-1">{severity.desc}</p><p className="font-mono text-[10px] text-muted-foreground mt-1">{severity.note}</p>
        </label>)}
      </div>
    </Panel>
  )
}
