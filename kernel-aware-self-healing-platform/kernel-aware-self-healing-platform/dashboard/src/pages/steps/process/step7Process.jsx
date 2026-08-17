import { Info } from "lucide-react"
import { Panel } from "@/components/kit"
import { cn } from "@/utils/cn"
import { Checkbox } from "../wizardComponents"
import { ACTION_TYPES } from "../wizardConstants"

export default function Step7({ form, setForm }) {
  const selected = Array.isArray(form.actionTypes) ? form.actionTypes : (form.actionType ? [form.actionType] : [])

  const toggle = (id) => {
    setForm(f => {
      const current = Array.isArray(f.actionTypes) ? f.actionTypes : (f.actionType ? [f.actionType] : [])
      const updated = current.includes(id) ? current.filter(x => x !== id) : [...current, id]
      return { ...f, actionTypes: updated }
    })
  }
  return (
    <Panel className="p-6">
      <div className="mb-5"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">7. Actions (What to Do )</p><p className="text-xs text-muted-foreground mt-0.5">Select the action type to perform when the condition is triggered.</p></div>
      <p className="font-mono text-[11px] text-foreground mb-3">Action Type <span className="text-destructive">*</span></p>
      <div className="grid grid-cols-3 gap-3">
        {ACTION_TYPES.map(a => { const Icon = a.icon; const sel = selected.includes(a.id); return (
          <label key={a.id} onClick={() => toggle(a.id)}
            className={cn("flex items-center gap-3 rounded-md border p-3.5 cursor-pointer transition-all", sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
            <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", a.bg)}><Icon className="size-4 text-white" /></div>
            <div className="flex-1 min-w-0"><p className="font-mono text-xs font-semibold text-foreground leading-tight">{a.title}</p><p className="font-mono text-[10px] text-muted-foreground leading-tight mt-0.5">{a.desc}</p></div>
            <Checkbox checked={sel} onClick={() => toggle(a.id)} />
          </label>
        )})}
      </div>
      <div className="mt-5 flex gap-2 rounded-md border border-accent/20 bg-accent/5 p-3">
        <Info className="size-4 text-accent shrink-0 mt-0.5" />
        <div>
          <p className="font-mono text-[11px] text-foreground">Note: Target selection (service, process, host, etc.) is handled by the respective domain owner.</p>
          <p className="font-mono text-[11px] text-accent mt-0.5">This policy only defines the action type.</p>
        </div>
      </div>
    </Panel>
  )
}
