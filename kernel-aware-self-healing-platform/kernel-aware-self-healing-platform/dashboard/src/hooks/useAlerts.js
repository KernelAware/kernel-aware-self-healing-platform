import { useEffect, useMemo, useState } from "react"
import { fetchIncidents } from "@/services/incidents"
import { useWebSocket } from "@/hooks/useWebSocket.js"

const SYSTEM_ID = import.meta.env.VITE_SYSTEM_ID || "1"

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

export function useAlerts(providedIncidents) {
  const [acknowledged, setAcknowledged] = useState(() => new Set())
  const [loadedIncidents, setLoadedIncidents] = useState([])
  const liveIncident = useWebSocket("incident_update")
  const incidents = providedIncidents ?? loadedIncidents

  useEffect(() => {
    if (providedIncidents !== undefined) return
    let active = true
    fetchIncidents(SYSTEM_ID).then(rows => {
      if (active) setLoadedIncidents(rows)
    }).catch(() => {})
    return () => { active = false }
  }, [providedIncidents])

  useEffect(() => {
    if (providedIncidents !== undefined || !liveIncident) return
    setLoadedIncidents(current => {
      const id = liveIncident.incident_id || liveIncident.id
      const index = current.findIndex(item => (item.incident_id || item.id) === id)
      if (index < 0) return [liveIncident, ...current]
      return current.map((item, itemIndex) => itemIndex === index ? { ...item, ...liveIncident } : item)
    })
  }, [liveIncident, providedIncidents])

  const alerts = useMemo(() => incidents
    .filter(incident => !["RESOLVED", "CLOSED"].includes(String(incident.status).toUpperCase()))
    .map(incident => {
      const original = incident.alert || {}
      return {
        ...original,
        id: incident.id,
        incident_id: incident.id,
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
        acked: acknowledged.has(incident.id),
      }
    }), [incidents, acknowledged])

  const acknowledgeAlert = id => setAcknowledged(current => new Set(current).add(id))
  return {
    alerts,
    acknowledgeAlert,
    criticalCount: alerts.filter(alert => alert.tone === "danger").length,
  }
}
