import { X, Plus, Mail, MessageSquare, Users, Settings, Link2 } from "lucide-react"
import { Panel } from "@/components/kit"
import { cn } from "@/utils/cn"
import { Checkbox } from "./wizardComponents"

const EVENTS = [
  "Incident detected",
  "Condition recovered",
  "Remediation started",
  "Remediation successful",
  "Remediation failed",
  "Approval required",
  "Max retries reached",
]

const CHANNELS = [
  { id: "email", label: "Email", icon: Mail },
  { id: "slack", label: "Slack", icon: MessageSquare },
  { id: "teams", label: "Teams", icon: Users },
  { id: "servicenow", label: "ServiceNow", icon: Settings },
  { id: "webhook", label: "Webhook", icon: Link2 },
]

export default function Step11({ form, setForm }) {
  const events = Array.isArray(form.notifications?.events)
    ? form.notifications.events
    : []

  const channels = Array.isArray(form.notifications?.channels)
    ? form.notifications.channels
    : []

  const recipients = Array.isArray(form.notifications?.recipients)
    ? form.notifications.recipients
    : []

  const toggle = (arr, value) => {
    return arr.includes(value)
      ? arr.filter(item => item !== value)
      : [...arr, value]
  }

  const toggleEvent = event => {
    setForm(f => ({
      ...f,
      notifications: {
        ...f.notifications,
        events: toggle(
          Array.isArray(f.notifications?.events)
            ? f.notifications.events
            : [],
          event
        ),
      },
    }))
  }

  const toggleChannel = channel => {
    setForm(f => ({
      ...f,
      notifications: {
        ...f.notifications,
        channels: toggle(
          Array.isArray(f.notifications?.channels)
            ? f.notifications.channels
            : [],
          channel
        ),
      },
    }))
  }

  const removeRecipient = recipient => {
    setForm(f => ({
      ...f,
      notifications: {
        ...f.notifications,
        recipients: (
          Array.isArray(f.notifications?.recipients)
            ? f.notifications.recipients
            : []
        ).filter(item => item !== recipient),
      },
    }))
  }

  const addRecipient = input => {
    const value = input.trim()

    if (!value) return

    setForm(f => {
      const current = Array.isArray(f.notifications?.recipients)
        ? f.notifications.recipients
        : []

      if (current.includes(value)) {
        return f
      }

      return {
        ...f,
        notifications: {
          ...f.notifications,
          recipients: [...current, value],
        },
      }
    })
  }

  return (
    <Panel className="p-6">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
          11. Notifications
        </p>

        <p className="text-xs text-muted-foreground mt-0.5">
          When and how should users be notified?
        </p>
      </div>

      <div className="space-y-6">

        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-3">
            Notify When
          </p>

          <div className="grid grid-cols-2 gap-2">
            {EVENTS.map(event => {
              const selected = events.includes(event)

              return (
                <label
                  key={event}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <Checkbox
                    checked={selected}
                    onClick={() => toggleEvent(event)}
                  />

                  <span className="font-mono text-xs text-foreground">
                    {event}
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-3">
            Notification Channels
          </p>

          <div className="flex flex-wrap gap-2">
            {CHANNELS.map(channel => {
              const Icon = channel.icon
              const active = channels.includes(channel.id)

              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => toggleChannel(channel.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <Icon className="size-3.5" />
                  {channel.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-2">
            Recipients
          </p>

          <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 min-h-[42px]">

            {recipients.map(recipient => (
              <span
                key={recipient}
                className="inline-flex items-center gap-1 rounded bg-secondary/70 border border-border px-2 py-0.5 font-mono text-[11px] text-foreground"
              >
                {recipient}

                <button
                  type="button"
                  onClick={() => removeRecipient(recipient)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer ml-0.5"
                >
                  <X className="size-2.5" />
                </button>
              </span>
            ))}

            <input
              placeholder="Add email?"
              className="flex-1 min-w-[120px] bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault()

                  const value = e.target.value

                  if (e.key === ",") {
                    const emails = value
                      .split(",")
                      .map(item => item.trim())
                      .filter(Boolean)

                    emails.forEach(addRecipient)
                  } else {
                    addRecipient(value)
                  }

                  e.target.value = ""
                }
              }}
            />

            <button
              type="button"
              onClick={e => {
                const input = e.currentTarget
                  .previousElementSibling

                if (input) {
                  addRecipient(input.value)
                  input.value = ""
                  input.focus()
                }
              }}
              className="ml-auto flex items-center gap-1 rounded border border-primary/30 px-2 py-0.5 font-mono text-[11px] text-primary hover:bg-primary/10 cursor-pointer"
            >
              <Plus className="size-3" />
              Add
            </button>
          </div>

          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            Separate multiple emails with commas
          </p>
        </div>

      </div>
    </Panel>
  )
}