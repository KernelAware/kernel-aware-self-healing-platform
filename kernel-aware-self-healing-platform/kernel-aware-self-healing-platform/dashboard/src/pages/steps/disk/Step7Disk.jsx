import { Info } from "lucide-react"
import { Panel } from "@/components/kit"
import { cn } from "@/utils/cn"
import { Checkbox, SelectBox } from "../wizardComponents"
import { ACTION_TYPES } from "../wizardConstants"

const DISK_ACTIONS = ["alert", "free-disk", "clear-cache", "run-automation", "run-command", "trigger-webhook", "send-notification", "create-incident", "require-approval"]

export default function Step7Disk({ form, setForm }) {
  const actions = Array.isArray(form.actionTypes) ? form.actionTypes : (form.actionType ? [form.actionType] : [])
  const toggle = id => setForm(f => ({ ...f, actionTypes: actions.includes(id) ? actions.filter(item => item !== id) : [...actions, id] }))
  return <Panel className="p-6">
    <div className="mb-5"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">7. DISK ACTIONS</p><p className="text-xs text-muted-foreground mt-0.5">Select the action to perform when the disk condition is triggered.</p></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{ACTION_TYPES.filter(action => DISK_ACTIONS.includes(action.id)).map(action => { const Icon = action.icon; const selected = actions.includes(action.id); return <label key={action.id} onClick={() => toggle(action.id)} className={cn("flex items-center gap-3 rounded-md border p-3.5 cursor-pointer", selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}><div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", action.bg)}><Icon className="size-4 text-white" /></div><div className="flex-1"><p className="font-mono text-xs font-semibold">{action.title}</p><p className="font-mono text-[10px] text-muted-foreground">{action.desc}</p></div><Checkbox checked={selected} onClick={() => toggle(action.id)} /></label>})}</div>
    {actions.includes("free-disk") && <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 rounded-md border border-primary/20 bg-primary/5 p-4"><label className="font-mono text-[11px]">Cleanup Strategy<SelectBox value={form.cleanupStrategy || "Temporary Files"} options={["Temporary Files", "Old Logs", "Package Cache", "Custom"]} onChange={v => setForm(f => ({ ...f, cleanupStrategy: v }))} className="mt-1.5" /></label><label className="font-mono text-[11px]">Maximum Cleanup Size<input value={form.maxCleanupSize || ""} onChange={e => setForm(f => ({ ...f, maxCleanupSize: e.target.value }))} placeholder="5 GB" className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs" /></label><label className="font-mono text-[11px]">Minimum File Age<input value={form.minFileAge || ""} onChange={e => setForm(f => ({ ...f, minFileAge: e.target.value }))} placeholder="7 days" className="mt-1.5 w-full rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs" /></label></div>}
    <div className="mt-5 flex gap-2 rounded-md border border-accent/20 bg-accent/5 p-3"><Info className="size-4 text-accent shrink-0" /><p className="font-mono text-[11px]">Disk actions are collected as frontend rule configuration. Execution is handled by the platform.</p></div>
  </Panel>
}
