
import { useCallback, useEffect, useState } from "react"
import { fetchIncidents } from "@/services/incidents"
import { getConfiguredSystemId } from "@/services/system"

function formatDisplayDate(value) {
  if (!value) return "--"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatResolvedDuration(start, resolvedAt) {
  if (!start || !resolvedAt) return "--"

  const startTs = new Date(start).getTime()
  const endTs = new Date(resolvedAt).getTime()

  if (Number.isNaN(startTs) || Number.isNaN(endTs)) {
    return "--"
  }

  const diffSeconds = Math.max(
    0,
    Math.floor((endTs - startTs) / 1000)
  )

  if (diffSeconds < 60) {
    return `${diffSeconds}s`
  }

  if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)}m ${diffSeconds % 60}s`
  }

  return `${Math.floor(diffSeconds / 3600)}h ${Math.floor(
    (diffSeconds % 3600) / 60
  )}m`
}

function normalizeIncident(value) {
  if (!value || typeof value !== "object") return null

  // Support both direct incident objects and wrapped payloads.
  const detail =
    value.data && typeof value.data === "object"
      ? value.data
      : value

  const metadata = detail.metadata || {}
  const alert = detail.alert || {}

  const trigger =
    detail.trigger ||
    metadata.trigger ||
    {}

  const decision =
    detail.decision ||
    metadata.decision ||
    {}

  const rootCause =
    detail.rootCause ||
    metadata.rootCause ||
    { verified: false, source: "Monitoring metrics", timeline: [] }

  const id = detail.incident_id || detail.id

  const status = String(detail.status || "OPEN").toUpperCase()

  const category = String(
    detail.monitor_type ||
    detail.incident_type ||
    detail.category ||
    "unknown"
  ).toLowerCase()

  const target =
    detail.target ||
    detail.process ||
    detail.service ||
    "Whole System"

  const createdAt =
    detail.created_at ||
    detail.createdAt ||
    detail.detected_at ||
    null

  const resolvedAt = detail.resolved_at || null

  const priority =
    detail.priority ||
    detail.prio ||
    alert.priority ||
    detail.level?.split(" - ")[0] ||
    "Medium"

  const severity =
    detail.severity ||
    alert.severity ||
    detail.level?.split(" - ")[1] ||
    "Warning"

  const policy = detail.policy || {
    ruleEnabled: true,
    automaticExecution: false,
    approvalRequired: false,
    cooldownPassed: true,
  }

  const operatorAction = detail.operatorAction || {
    required: status !== "RESOLVED",
    message:
      status === "RESOLVED"
        ? "Incident resolved."
        : "Review the recommendation and select an approved remediation action.",
    recommendedAction: decision.recommendedAction || "No action",
    allowedActions: [],
    selectedAction: decision.recommendedAction || "No action",
    reason: decision.reason || "No reason provided",
  }

  const durationSeconds =
    trigger.durationSeconds ??
    detail.duration_seconds ??
    0

  const duration =
    trigger.duration ||
    `${durationSeconds} seconds`

  return {
    ...detail,

    id,
    incident_id: id,

    category,
    monitor_type: category,

    target,
    system_id: detail.system_id ?? alert.system_id,
    system:
      detail.system ||
      alert.system ||
      `System ${detail.system_id ?? ""}`,

    title:
      detail.title ||
      alert.title ||
      `${trigger.metric || detail.metric || category} - ${target}`,

    description:
      detail.description ||
      detail.body ||
      decision.reason ||
      "Incident description unavailable",

    priority,
    prio: priority,
    severity,
    status,

    created_at: createdAt,
    start: createdAt ? formatDisplayDate(createdAt) : "--",

    resolved_at: resolvedAt,
    res: resolvedAt
      ? formatDisplayDate(resolvedAt)
      : status === "RESOLVED"
        ? "Resolved"
        : "--",

    resolvedDuration: formatResolvedDuration(
      createdAt,
      resolvedAt
    ),

    trigger: {
      ...trigger,
      metric:
        trigger.metric ||
        detail.metric ||
        alert.metric ||
        "Unknown metric",

      currentValue:
        trigger.currentValue ??
        detail.current_value ??
        alert.current_value,

      operator:
        trigger.operator ||
        detail.operator ||
        alert.operator ||
        "",

      threshold:
        trigger.threshold ??
        detail.threshold ??
        alert.threshold,

      unit:
        trigger.unit ||
        detail.violated_metric?.unit ||
        detail.unit ||
        alert.unit,

      duration,
      durationSeconds,
    },

    rootCause,
    decision,
    policy,
    operatorAction,

    process: detail.process || detail.service || target,
    pid: detail.pid ?? null,

    raised_by: detail.raised_by || null,
    metadata,
    alert: detail.alert || null,
  }
}

function mergeIncidents(primary, secondary = []) {
  const byId = new Map()

  ;[...primary, ...secondary].forEach((item) => {
    const normalized = normalizeIncident(item)

    if (!normalized) return

    const key = normalized.id || `${normalized.category}-${normalized.created_at}`

    byId.set(key, {
      ...(byId.get(key) || {}),
      ...normalized,
    })
  })

  return [...byId.values()].sort((a, b) => {
    const aTime =
      Date.parse(a.updated_at || a.created_at || 0) || 0

    const bTime =
      Date.parse(b.updated_at || b.created_at || 0) || 0

    return bTime - aTime
  })
}

export function useIncidents() {
  const [incidents, setIncidents] = useState([])
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    fetchIncidents(getConfiguredSystemId())
      .then((rows) => {
        if (!active) return

        const normalized = mergeIncidents(
          Array.isArray(rows) ? rows : []
        )

        setIncidents(normalized)

        const latestTimeline =
          normalized.find(
            (incident) =>
              incident.rootCause?.timeline?.length
          )?.rootCause?.timeline || []

        setTimeline(latestTimeline)
        setError("")
      })
      .catch((requestError) => {
        if (!active) return

        setError(
          requestError.message ||
          "Unable to load incident history."
        )
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const updateIncident = useCallback((incidentId, updates) => {
    setIncidents((current) =>
      current.map((item) =>
        item.id === incidentId
          ? { ...item, ...updates }
          : item
      )
    )
  }, [])

  return {
    incidents,
    setIncidents,
    updateIncident,
    timeline,
    setTimeline,
    loading,
    error,
  }
}
