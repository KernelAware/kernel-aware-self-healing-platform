import { X, Plus, Mail, MessageSquare, Users, Settings, Link2 } from "lucide-react"
import { Panel } from "@/components/kit"
import { cn } from "@/utils/cn"
import { Checkbox } from "./wizardComponents"

const EVENTS = ["Incident detected","Condition recovered","Remediation started","Remediation successful","Remediation failed","Approval required","Max retries reached"]
const CHANNELS = [{ id:"email",label:"Email",icon:Mail },{ id:"slack",label:"Slack",icon:MessageSquare },{ id:"teams",label:"Teams",icon:Users },{ id:"servicenow",label:"ServiceNow",icon:Settings },{ id:"webhook",label:"Webhook",icon:Link2 }]

export default function Step11({ form, setForm }) {
  const toggle = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">11. Notifications</p><p className="text-xs text-muted-foreground mt-0.5">When and how should users be notified?</p></div>
      <div className="space-y-6">
        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-3">Notify When</p>
          <div className="grid grid-cols-2 gap-2">
            {EVENTS.map(ev => (
              <label key={ev} className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox checked={form.notifyEvents.includes(ev)} onClick={() => setForm(f => ({ ...f, notifyEvents: toggle(f.notifyEvents, ev) }))} />
                <span className="font-mono text-xs text-foreground">{ev}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-3">Notification Channels</p>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map(ch => { const Icon = ch.icon; const active = form.notifyChannels.includes(ch.id); return (
              <button key={ch.id} onClick={() => setForm(f => ({ ...f, notifyChannels: toggle(f.notifyChannels, ch.id) }))}
                className={cn("inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer", active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
                <Icon className="size-3.5" />{ch.label}
              </button>
            )})}
          </div>
        </div>
        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-2">Recipients</p>
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 min-h-[42px]">
            {form.notifyRecipients.map(r => (
              <span key={r} className="inline-flex items-center gap-1 rounded bg-secondary/70 border border-border px-2 py-0.5 font-mono text-[11px] text-foreground">
                {r}<button onClick={() => setForm(f => ({ ...f, notifyRecipients: f.notifyRecipients.filter(x => x !== r) }))} className="text-muted-foreground hover:text-foreground cursor-pointer ml-0.5"><X className="size-2.5" /></button>
              </span>
            ))}
            <input placeholder="Add email…" className="flex-1 min-w-[120px] bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); const v = e.target.value.trim(); if (v && !form.notifyRecipients.includes(v)) setForm(f => ({ ...f, notifyRecipients: [...f.notifyRecipients, v] })); e.target.value = "" }}} />
            <button className="ml-auto flex items-center gap-1 rounded border border-primary/30 px-2 py-0.5 font-mono text-[11px] text-primary hover:bg-primary/10 cursor-pointer"><Plus className="size-3" /> Add</button>
          </div>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">Separate multiple emails with commas</p>
        </div>
      </div>
    </Panel>
  )
}
