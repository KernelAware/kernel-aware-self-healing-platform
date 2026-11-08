import { useState } from "react"
import { X, Mail, MessageSquare, Users, Settings, Link2 } from "lucide-react"
import { Panel } from "@/components/kit"
import { cn } from "@/utils/cn"
import { Checkbox } from "../wizardComponents"

const EVENTS = ["Incident Detected", "Remediation Started", "Remediation Successful", "Remediation Failed", "Condition Recovered", "Maximum Retries Reached", "Approval Required"]
const CHANNELS = [{ id: "email", label: "Email", icon: Mail }, { id: "slack", label: "Slack", icon: MessageSquare }, { id: "teams", label: "Microsoft Teams", icon: Users }, { id: "servicenow", label: "ServiceNow", icon: Settings }, { id: "webhook", label: "Webhook", icon: Link2 }]

export default function Step11Disk({ form, setForm }) {
  const notifications = form.notifications || {}
  const events = notifications.events || []
  const channels = notifications.channels || []
  const [recipientDraft, setRecipientDraft] = useState(notifications.recipientDraft || "")
  const update = values => setForm(current => ({ ...current, notifications: { ...current.notifications, ...values } }))
  const toggle = (values, value) => values.includes(value) ? values.filter(item => item !== value) : [...values, value]
  const updateRecipientDraft = value => {
    const entries = value.split(/[;,]/).map(item => item.trim())
    const draft = entries.pop() || ""
    const committed = entries.filter(Boolean)
    setRecipientDraft(draft)
    setForm(current => {
      const existing = Array.isArray(current.notifications?.recipients) ? current.notifications.recipients : []
      const previousDraft = current.notifications?.recipientDraft || ""
      const recipients = [...new Set([
        ...existing.filter(item => item !== previousDraft),
        ...committed,
        ...(draft ? [draft] : []),
      ])]
      return {
        ...current,
        notifications: {
          ...current.notifications,
          recipientDraft: draft,
          recipients,
        },
      }
    })
  }
  const addRecipient = event => { if (event.key !== "Enter" && event.key !== ",") return; event.preventDefault(); const values = event.currentTarget.value.split(/[;,]/).map(item => item.replace(/,$/, "").trim()).filter(Boolean); if (values.length) update({ recipients: [...new Set([...(notifications.recipients || []).filter(item => item !== recipientDraft.trim()), ...values])], recipientDraft: "" }); setRecipientDraft("") }
  return <Panel className="p-6"><div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">11. DISK NOTIFICATIONS</p><p className="text-xs text-muted-foreground mt-0.5">Select disk incident events and notification destinations.</p></div><div className="space-y-6"><div><p className="font-mono text-xs font-semibold mb-3">Notify When</p><div className="grid grid-cols-2 gap-2">{EVENTS.map(event => <label key={event} className="flex items-center gap-2.5 cursor-pointer"><Checkbox checked={events.includes(event)} onClick={() => update({ events: toggle(events, event) })} /><span className="font-mono text-xs">{event}</span></label>)}</div></div><div><p className="font-mono text-xs font-semibold mb-3">Notification Channels</p><div className="flex flex-wrap gap-2">{CHANNELS.map(channel => { const Icon = channel.icon; const active = channels.includes(channel.id); return <button type="button" key={channel.id} onClick={() => update({ channels: toggle(channels, channel.id) })} className={cn("inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-xs", active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50")}><Icon className="size-3.5" />{channel.label}</button> })}</div></div><div><p className="font-mono text-xs font-semibold mb-2">Recipients</p><div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 min-h-[42px]">{(notifications.recipients || []).map(recipient => <span key={recipient} className="inline-flex items-center gap-1 rounded bg-secondary/70 border border-border px-2 py-0.5 font-mono text-[11px]">{recipient}<button type="button" onClick={() => update({ recipients: notifications.recipients.filter(item => item !== recipient), recipientDraft: recipientDraft === recipient ? "" : notifications.recipientDraft })}><X className="size-2.5" /></button></span>)}<input value={recipientDraft} onChange={event => updateRecipientDraft(event.target.value)} placeholder="Add email or channel recipient" onKeyDown={addRecipient} className="flex-1 min-w-[160px] bg-transparent font-mono text-xs focus:outline-none" /></div></div></div></Panel>
}
