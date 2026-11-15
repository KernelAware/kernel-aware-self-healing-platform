import { Info } from "lucide-react"
import { Panel } from "@/components/kit"
import { cn } from "@/utils/cn"
import { Checkbox, SelectBox } from "../wizardComponents"
import { ACTION_TYPES } from "../wizardConstants"

const DISK_ACTIONS = ["alert", "free-disk", "clear-cache", "run-automation", "run-command", "trigger-webhook", "send-notification", "create-incident", "require-approval"]

export default function Step7Disk({ form, setForm }) {
  const selected = Array.isArray(form.actions) ? form.actions : []
  const actions = ACTION_TYPES.filter(action => DISK_ACTIONS.includes(action.id))
  const toggle = id => setForm(current => {
    const currentActions = Array.isArray(current.actions) ? current.actions : []
    return { ...current, actions: currentActions.includes(id) ? currentActions.filter(item => item !== id) : [...currentActions, id] }
  })
  return <Panel className="p-6">
    <div className="mb-5"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">7. DISK ACTIONS</p><p className="text-xs text-muted-foreground mt-0.5">Choose the response to a triggered disk incident.</p></div>
    <div className="grid grid-cols-3 gap-3">{actions.map(action => { const Icon = action.icon; const active = selected.includes(action.id); return <label key={action.id} onClick={() => toggle(action.id)} className={cn("flex items-center gap-3 rounded-md border p-3.5 cursor-pointer transition-all", active ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}><div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", action.bg)}><Icon className="size-4 text-white" /></div><div className="min-w-0 flex-1"><p className="font-mono text-xs font-semibold text-foreground">{action.title}</p><p className="font-mono text-[10px] text-muted-foreground">{action.desc}</p></div><Checkbox checked={active} onClick={event => { event.stopPropagation(); toggle(action.id) }} /></label> })}</div>
    {(selected.includes("free-disk") || selected.includes("clear-cache")) && <div className="mt-5 grid grid-cols-3 gap-3 rounded-md border border-primary/20 bg-primary/5 p-4"><label className="font-mono text-[11px] text-foreground">Cleanup Strategy<SelectBox value={form.cleanupStrategy || "Temporary Files"} options={["Temporary Files", "Old Logs", "Package Cache", "Custom"]} onChange={value => setForm(current => ({ ...current, cleanupStrategy: value }))} className="mt-1.5" /></label><label className="font-mono text-[11px] text-foreground">Maximum Cleanup Size<input type="number" min="0" value={form.maxCleanupSize || ""} onChange={event => setForm(current => ({ ...current, maxCleanupSize: event.target.value }))} placeholder="5" className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs" /></label><label className="font-mono text-[11px] text-foreground">Minimum File Age<input type="number" min="0" value={form.minFileAge || ""} onChange={event => setForm(current => ({ ...current, minFileAge: event.target.value }))} placeholder="7 days" className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs" /></label></div>}
    <div className="mt-5 flex gap-2 rounded-md border border-accent/20 bg-accent/5 p-3"><Info className="size-4 text-accent shrink-0 mt-0.5" /><p className="font-mono text-[11px] text-foreground">Disk cleanup settings collect limits only. The backend controls execution and protected paths.</p></div>
  </Panel>
}
