import { useState } from "react"
import { Panel } from "@/components/kit"
import { userRules } from "@/services/api"

const value = item => item == null || item === "" ? "Not configured" : String(item)

export default function Step13Disk({ form, onCancel }) {
  const [saveState, setSaveState] = useState("idle")
  const [saveError, setSaveError] = useState("")
  const target = form.targets?.find(item => ["host", "disk", "filesystem"].includes(item.type))
  const condition = target?.metrics?.[0]?.conditions?.[0]
  const recovery = form.recovery?.metric?.[0]
  const saveRule = async () => {
    if (saveState === "saving" || saveState === "saved") return

    setSaveState("saving")
    setSaveError("")
    const targets = Array.isArray(form.targets) ? form.targets : []
    const normalizedTargets = targets.map(target => ({
      ...target,
      metrics: Array.isArray(target.metrics) ? target.metrics.map(metric => ({
        ...metric,
        conditions: Array.isArray(metric.conditions) ? metric.conditions.map(condition => ({
          ...condition,
          operator: condition.operator || "Greater Than (>)",
          duration: condition.duration || "5",
          durationUnit: condition.durationUnit || "Minutes",
        })) : [],
      })) : [],
    }))
    const normalizedRecovery = Array.isArray(form.recovery?.metric)
      ? form.recovery.metric.map(condition => ({
        ...condition,
        operator: condition.operator || "Less Than (<)",
        duration: condition.duration || "5",
        durationUnit: condition.durationUnit || "Minutes",
      }))
      : []
    const payload = {
      ...form,
      monitorSource: "disk",
      targets: normalizedTargets,
      recovery: {
        ...form.recovery,
        metric: normalizedRecovery,
      },
      notifications: {
        ...form.notifications,
      },
    }
    delete payload.notifications.recipientDraft

    try {
      await userRules(payload)
      setSaveState("saved")
    } catch (error) {
      setSaveState("error")
      setSaveError(error.message || "Unable to save Disk rule")
    }
  }

  return <div className="space-y-4">
    <Panel className="p-5"><div className="mb-4"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">13. DISK RULE OBJECT</p><p className="text-xs text-muted-foreground mt-0.5">Review the shared form state collected by the Disk wizard before saving the rule.</p></div><div className="grid grid-cols-2 md:grid-cols-3 gap-4 font-mono text-xs"><div><p className="text-muted-foreground">Rule Name</p><p>{value(form.ruleName)}</p></div><div><p className="text-muted-foreground">Monitor Source</p><p>{value(form.monitorSource)}</p></div><div><p className="text-muted-foreground">Severity</p><p>{value(form.severity)}</p></div><div><p className="text-muted-foreground">Target Type</p><p>{value(target?.type)}</p></div><div><p className="text-muted-foreground">Target</p><p>{value(target?.name)}</p></div><div><p className="text-muted-foreground">Host</p><p>{value(target?.host)}</p></div><div><p className="text-muted-foreground">Metric</p><p>{value(target?.metrics?.[0]?.name)}</p></div><div className="col-span-2"><p className="text-muted-foreground">Trigger Condition</p><p>{value(condition?.metric)} {value(condition?.operator)} {value(condition?.threshold)} for {value(condition?.duration)} {value(condition?.durationUnit)}</p></div><div className="col-span-2 md:col-span-3"><p className="text-muted-foreground">Actions</p><p>{form.actions?.length ? form.actions.join(", ") : "Not configured"}</p></div></div></Panel>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Panel className="p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Safety & Retry</p><div className="space-y-2 font-mono text-xs"><p>Automatic execution: {form.safety?.autoExec ? "Enabled" : "Disabled"}</p><p>Approval: {value(form.safety?.approvalRequired)}</p><p>Allowed during: {value(form.safety?.allowedDuring)}</p><p>Max retries: {value(form.retry?.maxAttempts)}</p><p>Cooldown: {value(form.retry?.cooldownMinutes)} {value(form.retry?.cooldownUnit)}</p></div></Panel><Panel className="p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Recovery</p><div className="space-y-2 font-mono text-xs"><p>Metric: {value(recovery?.metric)}</p><p>Condition: {value(recovery?.operator)} {value(recovery?.threshold)}</p><p>Duration: {value(recovery?.duration)} {value(recovery?.durationUnit)}</p></div></Panel><Panel className="p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Notifications</p><div className="space-y-2 font-mono text-xs"><p>Events: {form.notifications?.events?.length ? form.notifications.events.join(", ") : "Not configured"}</p><p>Channels: {form.notifications?.channels?.length ? form.notifications.channels.join(", ") : "Not configured"}</p><p>Recipients: {form.notifications?.recipients?.length ? form.notifications.recipients.join(", ") : "Not configured"}</p></div></Panel><Panel className="p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Schedule</p><div className="space-y-2 font-mono text-xs"><p>Activation: {value(form.schedule?.activation)}</p><p>Timezone: {value(form.schedule?.timezone)}</p><p>Days: {form.schedule?.days?.length ? form.schedule.days.join(", ") : "Every day"}</p><p>Time: {form.schedule?.startTime && form.schedule?.endTime ? `${form.schedule.startTime} - ${form.schedule.endTime}` : "24/7"}</p></div></Panel></div>
    <Panel className="p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Form State</p><pre className="max-h-96 overflow-auto rounded-md border border-border bg-card p-3 font-mono text-[10px] text-foreground">{JSON.stringify(form, null, 2)}</pre></Panel>
    {saveError && <Panel className="border-destructive/40 bg-destructive/5 p-4"><p className="font-mono text-xs text-destructive">Unable to save Disk rule: {saveError}</p></Panel>}
    {saveState === "saved" && <Panel className="border-primary/40 bg-primary/5 p-4"><p className="font-mono text-xs text-primary">Disk rule saved successfully.</p></Panel>}
    <div className="flex justify-end gap-3"><button type="button" onClick={onCancel} className="inline-flex h-9 items-center rounded-md border border-border bg-card px-5 font-mono text-xs text-foreground hover:bg-secondary cursor-pointer">Exit Review</button><button type="button" onClick={saveRule} disabled={saveState === "saving" || saveState === "saved"} className="inline-flex h-9 items-center rounded-md bg-primary px-5 font-mono text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">{saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Save Rule"}</button></div>
  </div>
}
