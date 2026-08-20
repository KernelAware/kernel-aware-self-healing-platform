import React, { useState } from "react"
import {
  Check,
  Star,
  Plus,
  ArrowRight,
  CheckCircle,
} from "lucide-react"
import { Panel } from "@/components/kit"
import {userRules} from "../../services/api.js";

export default function Step13({ form, onCancel }) {
  const [created, setCreated] = useState(false)

  const targets = Array.isArray(form.targets) ? form.targets : []
  const actions = Array.isArray(form.actions) ? form.actions : []

  const notifications = form.notifications || {}

  const notificationEvents = Array.isArray(notifications.events)
    ? notifications.events
    : []

  const notificationChannels = Array.isArray(notifications.channels)
    ? notifications.channels
    : []

  const notificationRecipients = Array.isArray(notifications.recipients)
    ? notifications.recipients
    : []

  const retry = form.retry || {}
  const safety = form.safety || {}
  const recovery = form.recovery || {}
  const schedule = form.schedule || {}

  const recoveryConditions = Array.isArray(recovery.metric)
    ? recovery.metric
    : []

  const totalMetrics = targets.reduce(
    (total, target) =>
      total + (Array.isArray(target.metrics) ? target.metrics.length : 0),
    0
  )

  const totalConditions = targets.reduce(
    (total, target) =>
      total +
      (Array.isArray(target.metrics)
        ? target.metrics.reduce(
            (count, metric) =>
              count +
              (Array.isArray(metric.conditions)
                ? metric.conditions.length
                : 0),
            0
          )
        : 0),
    0
  )

  const getActionName = action => {
    if (typeof action === "string") return action
    return action?.type || "Unknown action"
  }

  const getTargetName = target => {
    if (target.type === "process") {
      return `${target.name || "Unknown process"}${
        target.host ? ` @ ${target.host}` : ""
      }`
    }

    return target.name || target.type || "Unknown target"
  }

  const getConditionText = condition => {
    if (!condition) return "Not configured"

    const operator =
      condition.operator
        ?.replace("Greater Than", ">")
        .replace("Less Than", "<")
        .replace("Equals", "=")
        .replace(/[()]/g, "") || ">"

    return `${condition.metric || "Metric"} ${operator} ${
      condition.threshold || "?"
    } for ${condition.duration || "?"} ${
      condition.durationUnit?.toLowerCase() || "minutes"
    }`
  }

  const getRecoveryConditionText = condition => {
    if (!condition) return "Not configured"

    const operator =
      condition.operator
        ?.replace("Greater Than", ">")
        .replace("Less Than", "<")
        .replace("Equals", "=")
        .replace(/[()]/g, "") || ">"

    return `${operator} ${condition.threshold || "?"} for ${
      condition.duration || "?"
    } ${condition.durationUnit?.toLowerCase() || "minutes"}`
  }

  const checklist = [
    "Basic Information",
    "Scope",
    "Monitor Source",
    "Targets & Metrics",
    "Conditions",
    "Severity",
    "Actions",
    "Safety & Approvals",
    "Retry & Cooldown",
    "Verification & Recovery",
    "Notifications",
    "Schedule",
  ]

  if (created) {
    return (
      <Panel className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="relative">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/20 shadow-glow-primary animate-pulse">
            <Check className="size-10 text-primary" />
          </div>

          <div className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Star className="size-3" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Rule Created Successfully!
          </h2>

          <p className="text-sm text-muted-foreground">
            Your rule has been created successfully.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card/50 p-4 text-left w-full max-w-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs">
            <span className="text-muted-foreground">Rule Name</span>

            <span className="text-foreground font-semibold">
              {form.ruleName || "Unnamed Rule"}
            </span>

            <span className="text-muted-foreground">Status</span>

            <span className="text-primary">
              {form.enabled ? "Enabled" : "Disabled"}
            </span>

            <span className="text-muted-foreground">Priority</span>

            <span className="text-foreground">
              {form.priority || "Medium"}
            </span>

            <span className="text-muted-foreground">Environment</span>

            <span className="text-foreground">
              {form.environment || "Not specified"}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-5 font-mono text-xs text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            View Rule Details
          </button>

          <button
            type="button"
            onClick={() => {
              setCreated(false)
              onCancel()
            }}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 font-mono text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-glow-primary transition-colors cursor-pointer"
          >
            <Plus className="size-3.5" />
            Create Another Rule
          </button>
        </div>
      </Panel>
    )
  }

  return (
    <div className="space-y-4">

      <Panel className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Review Checklist
          </p>

          <span className="font-mono text-[10px] text-primary">
            {checklist.length}/{checklist.length} Completed
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-5 gap-y-2">
          {checklist.map(item => (
            <div
              key={item}
              className="flex items-center gap-2"
            >
              <CheckCircle className="size-3.5 text-primary shrink-0" />

              <span className="font-mono text-[10px] text-foreground">
                {item}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
          Rule Summary
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">

          <div>
            <p className="font-mono text-[10px] text-muted-foreground">
              Rule Name
            </p>

            <p className="font-mono text-xs text-foreground font-semibold">
              {form.ruleName || "Not provided"}
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] text-muted-foreground">
              Status
            </p>

            <p className="font-mono text-xs text-primary font-semibold">
              {form.enabled ? "Enabled" : "Disabled"}
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] text-muted-foreground">
              Priority
            </p>

            <p className="font-mono text-xs text-foreground font-semibold">
              {form.priority || "Medium"}
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] text-muted-foreground">
              Severity
            </p>

            <p className="font-mono text-xs text-warning font-semibold">
              {form.severity || "Warning"}
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] text-muted-foreground">
              Owner
            </p>

            <p className="font-mono text-xs text-foreground">
              {form.owner || "Not specified"}
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] text-muted-foreground">
              Environment
            </p>

            <p className="font-mono text-xs text-foreground">
              {form.environment || "Not specified"}
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] text-muted-foreground">
              Region
            </p>

            <p className="font-mono text-xs text-foreground">
              {form.region || "Not specified"}
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] text-muted-foreground">
              Monitor Source
            </p>

            <p className="font-mono text-xs text-foreground">
              {form.monitorSource || "Not specified"}
            </p>
          </div>

          <div className="col-span-2 md:col-span-3 lg:col-span-4">
            <p className="font-mono text-[10px] text-muted-foreground">
              Description
            </p>

            <p className="font-mono text-xs text-foreground leading-relaxed">
              {form.description || "Not provided"}
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <Panel className="p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
            Scope
          </p>

          <div className="space-y-2 font-mono text-xs">

            <div className="flex gap-3">
              <span className="text-muted-foreground w-24 shrink-0">
                Environment
              </span>

              <span className="text-foreground">
                {form.environment || "Not specified"}
              </span>
            </div>

            <div className="flex gap-3">
              <span className="text-muted-foreground w-24 shrink-0">
                Region
              </span>

              <span className="text-foreground">
                {form.region || "Not specified"}
              </span>
            </div>

            <div className="flex gap-3">
              <span className="text-muted-foreground w-24 shrink-0">
                Apply To
              </span>

              <span className="text-foreground">
                {form.applyTo || "Not specified"}
              </span>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
            Monitoring Overview
          </p>

          <div className="grid grid-cols-2 gap-3">

            <div className="rounded-md border border-border bg-card p-3">
              <p className="font-mono text-[10px] text-muted-foreground">
                Source
              </p>

              <p className="font-mono text-xs text-foreground mt-1">
                {form.monitorSource || "Not specified"}
              </p>
            </div>

            <div className="rounded-md border border-border bg-card p-3">
              <p className="font-mono text-[10px] text-muted-foreground">
                Targets
              </p>

              <p className="font-mono text-sm text-primary font-semibold mt-1">
                {targets.length}
              </p>
            </div>

            <div className="rounded-md border border-border bg-card p-3">
              <p className="font-mono text-[10px] text-muted-foreground">
                Metrics
              </p>

              <p className="font-mono text-sm text-primary font-semibold mt-1">
                {totalMetrics}
              </p>
            </div>

            <div className="rounded-md border border-border bg-card p-3">
              <p className="font-mono text-[10px] text-muted-foreground">
                Trigger Conditions
              </p>

              <p className="font-mono text-sm text-primary font-semibold mt-1">
                {totalConditions}
              </p>
            </div>

          </div>
        </Panel>
      </div>

      <Panel className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Targets & Metrics
          </p>

          <span className="font-mono text-[10px] text-muted-foreground">
            {targets.length} target{targets.length !== 1 ? "s" : ""}
          </span>
        </div>

        {targets.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-4 text-center">
            <p className="font-mono text-xs text-muted-foreground">
              No targets configured.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {targets.map((target, targetIndex) => (
              <div
                key={`${target.name || target.type}-${targetIndex}`}
                className="rounded-md border border-border bg-card p-3"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-semibold text-primary">
                    {getTargetName(target)}
                  </span>

                  <span className="rounded border border-border px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
                    {target.type || "target"}
                  </span>
                </div>

                {Array.isArray(target.metrics) &&
                target.metrics.length > 0 ? (
                  <div className="space-y-2">
                    {target.metrics.map((metric, metricIndex) => (
                      <div
                        key={`${metric.name}-${metricIndex}`}
                        className="rounded-md border border-border/70 bg-secondary/10 p-2.5"
                      >
                        <p className="font-mono text-[11px] text-foreground font-semibold">
                          {metric.name || "Unnamed metric"}
                        </p>

                        {Array.isArray(metric.conditions) &&
                        metric.conditions.length > 0 ? (
                          <div className="mt-2 space-y-1">
                            {metric.conditions.map(
                              (condition, conditionIndex) => (
                                <div
                                  key={conditionIndex}
                                  className="font-mono text-[10px] text-muted-foreground"
                                >
                                  <span className="text-foreground">
                                    {getConditionText(condition)}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                            No conditions configured.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-[10px] text-muted-foreground">
                    No metrics configured.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <Panel className="p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
            Actions
          </p>

          {actions.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-3">
              <p className="font-mono text-xs text-muted-foreground">
                No actions configured.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map((action, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
                >
                  <CheckCircle className="size-3.5 text-primary shrink-0" />

                  <span className="font-mono text-xs text-foreground">
                    {getActionName(action)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
            Safety & Approvals
          </p>

          <div className="space-y-2 font-mono text-xs">

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Automatic Execution
              </span>

              <span className="text-foreground">
                {safety.autoExec ? "Enabled" : "Disabled"}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Approval Required
              </span>

              <span className="text-foreground">
                {safety.approvalRequired || "Always"}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Allowed During
              </span>

              <span className="text-foreground">
                {safety.allowedDuring || "Always"}
              </span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <Panel className="p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
            Retry & Cooldown
          </p>

          <div className="space-y-2 font-mono text-xs">

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Max Attempts
              </span>

              <span className="text-foreground">
                {retry.maxAttempts ?? 0}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Cooldown
              </span>

              <span className="text-foreground">
                {retry.cooldownMinutes ?? 0} minutes
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Suppress Duplicates
              </span>

              <span className="text-foreground">
                {retry.suppressDuplicates ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
            Recovery
          </p>

          <div className="space-y-3 font-mono text-xs">

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Verification
              </span>

              <span className="text-foreground">
                {recovery.required ? "Required" : "Not Required"}
              </span>
            </div>

            {recoveryConditions.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-secondary/10 p-3">
                <p className="text-[10px] text-muted-foreground">
                  Opposite of trigger conditions will be used for recovery
                  verification.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-[10px] text-muted-foreground mb-2">
                  Recovery Conditions
                </p>

                <div className="space-y-2">
                  {recoveryConditions.map((condition, index) => (
                    <div
                      key={index}
                      className="rounded-md border border-border bg-card p-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-primary font-semibold">
                          {condition.metric || "Unknown metric"}
                        </span>

                        <span className="text-[9px] text-muted-foreground">
                          Condition {index + 1}
                        </span>
                      </div>

                      <p className="mt-1.5 text-[10px] text-foreground">
                        {getRecoveryConditionText(condition)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <Panel className="p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
            Notifications
          </p>

          <div className="space-y-3">

            <div>
              <p className="font-mono text-[10px] text-muted-foreground mb-1">
                Events
              </p>

              {notificationEvents.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {notificationEvents.map(event => (
                    <span
                      key={event}
                      className="rounded border border-border bg-card px-2 py-1 font-mono text-[10px] text-foreground"
                    >
                      {event}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="font-mono text-xs text-muted-foreground">
                  None configured
                </p>
              )}
            </div>

            <div>
              <p className="font-mono text-[10px] text-muted-foreground mb-1">
                Channels
              </p>

              <p className="font-mono text-xs text-foreground">
                {notificationChannels.length
                  ? notificationChannels.join(", ")
                  : "None configured"}
              </p>
            </div>

            <div>
              <p className="font-mono text-[10px] text-muted-foreground mb-1">
                Recipients
              </p>

              <p className="font-mono text-xs text-foreground break-words">
                {notificationRecipients.length
                  ? notificationRecipients.join(", ")
                  : "None configured"}
              </p>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
            Schedule
          </p>

          <div className="space-y-3 font-mono text-xs">

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Activation
              </span>

              <span className="text-foreground">
                {schedule.activation || "Always Active"}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Timezone
              </span>

              <span className="text-foreground">
                {schedule.timezone || "UTC"}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Days
              </span>

              <span className="text-foreground">
                {Array.isArray(schedule.days) && schedule.days.length
                  ? schedule.days.join(", ")
                  : "Every day"}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Time Window
              </span>

              <span className="text-foreground">
                {schedule.startTime && schedule.endTime
                  ? `${schedule.startTime} - ${schedule.endTime}`
                  : "24/7"}
              </span>
            </div>
          </div>
        </Panel>
      </div>

      <Panel className="p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Rule Logic
        </p>

        <p className="font-mono text-xs text-foreground leading-relaxed">
          When any configured monitoring condition is satisfied, this rule
          will create a{" "}
          <span className="text-warning font-semibold">
            {form.severity || "Warning"}
          </span>{" "}
          severity incident and execute the configured action according to
          the defined safety, retry, recovery, notification, and schedule
          policies.
        </p>
      </Panel>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={() => {
            userRules(form).then(r => {
              if (res.ok){
                setCreated(true)
              }
            })

          }}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-6 font-mono text-xs font-bold tracking-wide text-primary-foreground hover:bg-primary/90 shadow-glow-primary transition-colors cursor-pointer"
        >
          Create Rule
          <ArrowRight className="size-3.5" />
        </button>
      </div>
    </div>
  )
}