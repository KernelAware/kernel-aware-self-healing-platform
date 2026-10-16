import { useState } from "react"
import { ArrowRight, CheckCircle } from "lucide-react"
import { Panel } from "@/components/kit"
import { userRules } from "@/services/api"
import { DISK_METRICS } from "./diskHelpers"

export default function Step13Disk({ form, onCancel }) {
  const [saveState, setSaveState] = useState("idle")
  const [saveError, setSaveError] = useState("")
  const target = form.targets?.find(item => ["host", "disk", "filesystem", "process"].includes(item.type))
  const condition = target?.metrics?.[0]?.conditions?.[0]
  const targets = Array.isArray(form.targets) ? form.targets : []
  const actions = Array.isArray(form.actions) ? form.actions : []
  const notifications = form.notifications || {}
  const recoveryConditions = Array.isArray(form.recovery?.metric) ? form.recovery.metric : []
  const metricId = condition?.metric || target?.metrics?.[0]?.name || form.metric
  const metric = DISK_METRICS.find(item => item.id === metricId)
  const metricTitle = metric?.title || metricId || "Not configured"
  const metricCount = targets.reduce((count, item) => count + (Array.isArray(item.metrics) ? item.metrics.length : 0), 0)
  const conditionCount = targets.reduce((count, item) => count + (Array.isArray(item.metrics) ? item.metrics.reduce((metricTotal, itemMetric) => metricTotal + (Array.isArray(itemMetric.conditions) ? itemMetric.conditions.length : 0), 0) : 0), 0)

  const conditionText = item => {
    if (!item) return "Not configured"
    const operator = item.operator?.replace("Greater Than", ">").replace("Less Than", "<").replace("Equals", "=").replace(/[()]/g, "") || ">"
    return `${item.metric || "Metric"} ${operator} ${item.threshold || "?"} for ${item.duration || "?"} ${item.durationUnit?.toLowerCase() || "minutes"}`
  }

  const recoveryText = item => {
    if (!item) return "Not configured"
    const operator = item.operator?.replace("Greater Than", ">").replace("Less Than", "<").replace("Equals", "=").replace(/[()]/g, "") || ">"
    return `${operator} ${item.threshold || "?"} for ${item.duration || "?"} ${item.durationUnit?.toLowerCase() || "minutes"}`
  }

  const saveRule = async () => {
    if (saveState === "saving" || saveState === "saved") return

    setSaveState("saving")
    setSaveError("")
    const targets = Array.isArray(form.targets) ? form.targets : []
    const normalizedTargets = targets.map(target => ({
      ...target,
      ...(["host", "disk", "filesystem", "process"].includes(target.type) ? { host: null } : {}),
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
      monitorSource: form.monitorSource || "disk",
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
    <Panel className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Review Checklist</p>
        <span className="font-mono text-[10px] text-primary">12/12 Completed</span>
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {["Basic Information", "Scope", "Monitor Source", "Targets & Metrics", "Conditions", "Severity", "Actions", "Safety & Approvals", "Retry & Cooldown", "Verification & Recovery", "Notifications", "Schedule"].map(item => <div key={item} className="flex items-center gap-2"><CheckCircle className="size-3.5 shrink-0 text-primary" /><span className="font-mono text-[10px] text-foreground">{item}</span></div>)}
      </div>
    </Panel>

    <Panel className="p-5">
      <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">DISK RULE SUMMARY</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
        {[
          ["Rule Name", form.ruleName || "Not provided"],
          ["Status", form.enabled ? "Enabled" : "Disabled"],
          ["Priority", form.priority || "Medium"],
          ["Severity", form.severity || "Warning"],
          ["Owner", form.owner || "Not specified"],
          ["Environment", form.environment || "Not specified"],
          ["Region", form.region || "Not specified"],
          ["Monitor Source", form.monitorSource || "Not specified"],
        ].map(([label, shownValue]) => <div key={label}><p className="font-mono text-[10px] text-muted-foreground">{label}</p><p className={`font-mono text-xs ${label === "Severity" ? "text-warning" : label === "Status" && form.enabled ? "text-primary" : "text-foreground"} font-semibold`}>{shownValue}</p></div>)}
        <div className="col-span-2 md:col-span-3 lg:col-span-4"><p className="font-mono text-[10px] text-muted-foreground">Description</p><p className="font-mono text-xs leading-relaxed text-foreground">{form.description || "Not provided"}</p></div>
      </div>
    </Panel>

    <Panel className="p-4">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Disk Monitoring & Condition</p>
      <div className="grid grid-cols-2 gap-3 font-mono text-xs md:grid-cols-4">
        {[
          ["Metric", metricTitle],
          ["Unit", metric?.unit || "Not specified"],
          ["Target Type", target?.type || "Not configured"],
          ["Target", target?.name || "Not configured"],
          ["Host", target?.host || "Not specified"],
          ["Aggregation", form.aggregation || "Not specified"],
        ].map(([label, shownValue]) => <div key={label}><p className="text-muted-foreground">{label}</p><p className="text-foreground">{shownValue}</p></div>)}
        <div className="col-span-2 md:col-span-4"><p className="text-muted-foreground">Condition</p><p className="text-foreground">{conditionText(condition)}</p></div>
      </div>
    </Panel>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel className="p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Scope</p>
        <div className="space-y-2 font-mono text-xs">
          <p><span className="mr-3 inline-block w-24 text-muted-foreground">Environment</span><span className="text-foreground">{form.environment || "Not specified"}</span></p>
          <p><span className="mr-3 inline-block w-24 text-muted-foreground">Region</span><span className="text-foreground">{form.region || "Not specified"}</span></p>
          <p><span className="mr-3 inline-block w-24 text-muted-foreground">Apply To</span><span className="text-foreground">{form.applyTo || "Not specified"}</span></p>
        </div>
      </Panel>
      <Panel className="p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Monitoring Overview</p>
        <div className="grid grid-cols-2 gap-3">
          {[["Source", form.monitorSource || "Not specified"], ["Targets", String(targets.length)], ["Metrics", String(metricCount)], ["Trigger Conditions", String(conditionCount)]].map(([label, shownValue]) => <div key={label} className="rounded-md border border-border bg-card p-3"><p className="font-mono text-[10px] text-muted-foreground">{label}</p><p className="mt-1 font-mono text-sm font-semibold text-primary">{shownValue}</p></div>)}
        </div>
      </Panel>
    </div>

    <Panel className="p-4">
      <div className="mb-3 flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Targets & Metrics</p><span className="font-mono text-[10px] text-muted-foreground">{targets.length} target{targets.length === 1 ? "" : "s"}</span></div>
      {targets.length === 0 ? <div className="rounded-md border border-dashed border-border p-4 text-center"><p className="font-mono text-xs text-muted-foreground">No targets configured.</p></div> : <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {targets.map((item, targetIndex) => <div key={`${item.name || item.type}-${targetIndex}`} className="rounded-md border border-border bg-card p-3">
          <div className="mb-3 flex items-center justify-between gap-3"><span className="font-mono text-xs font-semibold text-primary">{item.name || "Unknown target"}</span><span className="rounded border border-border px-2 py-0.5 font-mono text-[9px] text-muted-foreground">{item.type || "target"}</span></div>
          {Array.isArray(item.metrics) && item.metrics.length ? <div className="space-y-2">{item.metrics.map((itemMetric, metricIndex) => <div key={`${itemMetric.name}-${metricIndex}`} className="rounded-md border border-border/70 bg-secondary/10 p-2.5">
            <p className="font-mono text-[11px] font-semibold text-foreground">{DISK_METRICS.find(entry => entry.id === itemMetric.name)?.title || itemMetric.name || "Unnamed metric"}</p>
            {itemMetric.name && <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{itemMetric.name}</p>}
            {Array.isArray(itemMetric.conditions) && itemMetric.conditions.length ? <div className="mt-2 space-y-1">{itemMetric.conditions.map((itemCondition, conditionIndex) => <p key={conditionIndex} className="font-mono text-[10px] text-muted-foreground"><span className="text-foreground">{conditionText(itemCondition)}</span></p>)}</div> : <p className="mt-1 font-mono text-[10px] text-muted-foreground">No conditions configured.</p>}
          </div>)}</div> : <p className="font-mono text-[10px] text-muted-foreground">No metrics configured.</p>}
        </div>)}
      </div>}
    </Panel>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel className="p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Actions</p>
        {actions.length ? <div className="space-y-2">{actions.map((action, index) => <div key={index} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"><CheckCircle className="size-3.5 shrink-0 text-primary" /><span className="font-mono text-xs text-foreground">{typeof action === "string" ? action : action?.type || "Unknown action"}</span></div>)}</div> : <div className="rounded-md border border-dashed border-border p-3"><p className="font-mono text-xs text-muted-foreground">No actions configured.</p></div>}
      </Panel>
      <Panel className="p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Safety & Approvals</p>
        <div className="space-y-2 font-mono text-xs">
          <p className="flex justify-between gap-4"><span className="text-muted-foreground">Automatic Execution</span><span className="text-foreground">{form.safety?.autoExec ? "Enabled" : "Disabled"}</span></p>
          <p className="flex justify-between gap-4"><span className="text-muted-foreground">Approval Required</span><span className="text-foreground">{form.safety?.approvalRequired || "Always"}</span></p>
          <p className="flex justify-between gap-4"><span className="text-muted-foreground">Allowed During</span><span className="text-foreground">{form.safety?.allowedDuring || "Always"}</span></p>
        </div>
      </Panel>
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel className="p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Retry & Cooldown</p>
        <div className="space-y-2 font-mono text-xs">
          <p className="flex justify-between gap-4"><span className="text-muted-foreground">Max Attempts</span><span className="text-foreground">{form.retry?.maxAttempts ?? 0}</span></p>
          <p className="flex justify-between gap-4"><span className="text-muted-foreground">Cooldown</span><span className="text-foreground">{form.retry?.cooldownMinutes ?? 0} {form.retry?.cooldownUnit || "minutes"}</span></p>
          <p className="flex justify-between gap-4"><span className="text-muted-foreground">Suppress Duplicates</span><span className="text-foreground">{form.retry?.suppressDuplicates ? "Enabled" : "Disabled"}</span></p>
        </div>
      </Panel>
      <Panel className="p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Recovery</p>
        <div className="space-y-3 font-mono text-xs">
          <p className="flex justify-between gap-4"><span className="text-muted-foreground">Verification</span><span className="text-foreground">{form.recovery?.required ? "Required" : "Not Required"}</span></p>
          {recoveryConditions.length ? <div><p className="mb-2 text-[10px] text-muted-foreground">Recovery Conditions</p><div className="space-y-2">{recoveryConditions.map((item, index) => <div key={index} className="rounded-md border border-border bg-card p-2.5"><div className="flex items-center justify-between gap-3"><span className="font-semibold text-primary">{item.metric || "Not configured"}</span><span className="text-[9px] text-muted-foreground">Condition {index + 1}</span></div><p className="mt-1.5 text-[10px] text-foreground">{recoveryText(item)}</p></div>)}</div></div> : <div className="rounded-md border border-dashed border-border bg-secondary/10 p-3"><p className="text-[10px] text-muted-foreground">{form.recovery?.required ? "No recovery condition configured." : "Opposite of trigger conditions will be used for recovery verification."}</p></div>}
        </div>
      </Panel>
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel className="p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Notifications</p>
        <div className="space-y-3">
          <div><p className="mb-1 font-mono text-[10px] text-muted-foreground">Events</p>{notifications.events?.length ? <div className="flex flex-wrap gap-1.5">{notifications.events.map(event => <span key={event} className="rounded border border-border bg-card px-2 py-1 font-mono text-[10px] text-foreground">{event}</span>)}</div> : <p className="font-mono text-xs text-muted-foreground">None configured</p>}</div>
          <div><p className="mb-1 font-mono text-[10px] text-muted-foreground">Channels</p><p className="font-mono text-xs text-foreground">{notifications.channels?.length ? notifications.channels.join(", ") : "None configured"}</p></div>
          <div><p className="mb-1 font-mono text-[10px] text-muted-foreground">Recipients</p><p className="break-words font-mono text-xs text-foreground">{notifications.recipients?.length ? notifications.recipients.join(", ") : "None configured"}</p></div>
        </div>
      </Panel>
      <Panel className="p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Schedule</p>
        <div className="space-y-3 font-mono text-xs">
          <p className="flex justify-between gap-4"><span className="text-muted-foreground">Activation</span><span className="text-foreground">{form.schedule?.activation || "Always Active"}</span></p>
          <p className="flex justify-between gap-4"><span className="text-muted-foreground">Timezone</span><span className="text-foreground">{form.schedule?.timezone || "UTC"}</span></p>
          <p className="flex justify-between gap-4"><span className="text-muted-foreground">Days</span><span className="text-foreground">{form.schedule?.days?.length ? form.schedule.days.join(", ") : "Every day"}</span></p>
          <p className="flex justify-between gap-4"><span className="text-muted-foreground">Time Window</span><span className="text-foreground">{form.schedule?.startTime && form.schedule?.endTime ? `${form.schedule.startTime} - ${form.schedule.endTime}` : "24/7"}</span></p>
        </div>
      </Panel>
    </div>

    <Panel className="p-4">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Rule Logic</p>
      <p className="font-mono text-xs leading-relaxed text-foreground">When the configured Disk condition for <span className="font-semibold">{metricTitle}</span> is satisfied, this rule will create a <span className="font-semibold text-warning">{form.severity || "Warning"}</span> severity incident and execute the configured actions according to its safety, retry, recovery, notification, and schedule settings.</p>
    </Panel>

    {saveError && <Panel className="border-destructive/40 bg-destructive/5 p-4"><p className="font-mono text-xs text-destructive">Unable to save Disk rule: {saveError}</p></Panel>}
    {saveState === "saved" && <Panel className="border-primary/40 bg-primary/5 p-4"><div className="flex items-center gap-2"><CheckCircle className="size-4 text-primary" /><p className="font-mono text-xs text-primary">Disk rule saved successfully.</p></div></Panel>}
    <div className="flex justify-end gap-3 pt-1">
      <button type="button" onClick={onCancel} className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-5 font-mono text-xs text-foreground transition-colors hover:bg-secondary">Exit Review</button>
      <button type="button" onClick={saveRule} disabled={saveState === "saving" || saveState === "saved"} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-6 font-mono text-xs font-bold text-primary-foreground shadow-glow-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">{saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Save Rule"}<ArrowRight className="size-3.5" /></button>
    </div>
  </div>
}
