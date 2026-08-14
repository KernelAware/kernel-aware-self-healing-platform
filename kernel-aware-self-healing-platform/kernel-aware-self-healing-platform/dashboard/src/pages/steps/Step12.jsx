import { Globe, ChevronDown } from "lucide-react"
import { Panel } from "@/components/kit"
import { cn } from "@/utils/cn"
import { Radio, Checkbox } from "./wizardComponents"

export default function Step12({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">12. Schedule</p><p className="text-xs text-muted-foreground mt-0.5">When should this rule be active?</p></div>
      <div className="space-y-6">
        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-3">Activation</p>
          <div className="grid grid-cols-2 gap-3">
            {[{ id:"always",label:"Always Active",desc:"Runs rule 24/7 without interruption." },{ id:"custom",label:"Custom Schedule",desc:"Set specific days and times." }].map(opt => (
              <label key={opt.id} onClick={() => setForm(f => ({ ...f, schedule: opt.id }))}
                className={cn("flex flex-col gap-1.5 rounded-md border p-4 cursor-pointer transition-colors", form.schedule === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
                <div className="flex items-center justify-between"><p className="font-mono text-xs font-semibold text-foreground">{opt.label}</p><Radio checked={form.schedule === opt.id} /></div>
                <p className="font-mono text-[10px] text-muted-foreground">{opt.desc}</p>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-3">Maintenance Mode</p>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox checked={form.suppressMaintenance} onClick={() => setForm(f => ({ ...f, suppressMaintenance: !f.suppressMaintenance }))} />
            <span className="font-mono text-xs text-foreground">Suppress alerts during maintenance windows</span>
          </label>
        </div>
        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-2">Timezone</p>
          <div className="relative">
            <Globe className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <select className="w-full appearance-none rounded-md border border-border bg-card pl-9 pr-8 py-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none cursor-pointer">
              <option>(UTC) Coordinated Universal Time</option>
              <option>(UTC+5:30) India Standard Time</option>
              <option>(UTC-5:00) Eastern Standard Time</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </Panel>
  )
}
