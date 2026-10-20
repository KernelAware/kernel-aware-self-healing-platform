import { useCallback, useEffect, useMemo, useState } from "react"
import { wsBroker } from "@/services/websocket"

const LIVE_INCIDENT_EVENTS = new Set(["opened", "updated", "resolved"])
const USER_RULE_CATEGORIES = new Set(["cpu", "memory", "disk", "process"])

function ageFor(value) {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(value || "")) / 1000))
  if (!Number.isFinite(seconds)) return ""
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

const toneForSeverity = severity => ({
  critical: "danger",
  high: "warning",
  medium: "muted",
  warning: "muted",
  low: "muted",
}[String(severity || "").toLowerCase()] || "muted")

export function useAlerts({ ruleAlertsOnly = false } = {}) {
  const [acknowledged, setAcknowledged] = useState(() => new Set())
  // Active alerts are session-local: history and browser storage never hydrate this list.
  const [liveIncidents, setLiveIncidents] = useState([])

  useEffect(() => {
    const unsubscribe = wsBroker.subscribe(message => {
      if (message?.type !== "incident_update" || !LIVE_INCIDENT_EVENTS.has(message.event)) return
      const liveIncident = message.data
      if (!liveIncident) return
      const monitorType = String(liveIncident.monitor_type || liveIncident.incident_type || liveIncident.category || "").toLowerCase()
      if (ruleAlertsOnly && !USER_RULE_CATEGORIES.has(monitorType)) return
      setLiveIncidents(current => {
        const id = liveIncident.incident_id || liveIncident.id
        if (!id) return current
        const normalizedIncident = { ...liveIncident, id, incident_id: id }
        const index = current.findIndex(item => (item.incident_id || item.id) === id)
        // The Disk evaluator can resume a still-active rule violation from
        // Redis and publish its first event in this page session as "updated".
        // The backend sends no historical snapshot on WebSocket connect, so
        // accept that live Disk update while keeping other workflows unchanged.
        const startsLiveEntry = message.event === "opened"
          || (monitorType === "disk" && message.event === "updated")
        if (index < 0) return startsLiveEntry ? [normalizedIncident, ...current] : current
        return current.map((item, itemIndex) => itemIndex === index ? { ...item, ...normalizedIncident } : item)
      })
    })
    return unsubscribe
  }, [ruleAlertsOnly])

  const alerts = useMemo(() => liveIncidents
    .filter(incident => !["RESOLVED", "CLOSED"].includes(String(incident.status).toUpperCase()))
    .map(incident => {
      const original = incident.alert || {}
      const id = incident.incident_id || incident.id
      return {
        ...original,
        id,
        incident_id: id,
        category: incident.category,
        monitor_type: incident.monitor_type,
        target: incident.target,
        metric: incident.trigger?.metric || incident.metric,
        current_value: incident.trigger?.currentValue ?? incident.current_value,
        threshold: incident.trigger?.threshold ?? incident.threshold,
        operator: incident.trigger?.operator || incident.operator,
        severity: incident.severity,
        priority: incident.priority,
        status: incident.status,
        title: incident.title,
        system: incident.system,
        system_id: incident.system_id,
        process: incident.process,
        pid: incident.pid,
        age: incident.created_at ? ageFor(incident.created_at) : original.age || "",
        tone: original.tone || toneForSeverity(incident.severity),
        level: original.level || `${incident.priority} - ${incident.severity}`,
        acked: acknowledged.has(id),
      }
    }), [liveIncidents, acknowledged])

  const acknowledgeAlert = id => setAcknowledged(current => new Set(current).add(id))
  const updateLiveIncident = useCallback((incidentId, updates) => {
    setLiveIncidents(current => current.map(incident =>
      (incident.incident_id || incident.id) === incidentId
        ? { ...incident, ...updates }
        : incident,
    ))
  }, [])

  return {
    alerts,
    liveIncidents,
    updateLiveIncident,
    acknowledgeAlert,
    criticalCount: alerts.filter(alert => alert.tone === "danger").length,
  }
}
