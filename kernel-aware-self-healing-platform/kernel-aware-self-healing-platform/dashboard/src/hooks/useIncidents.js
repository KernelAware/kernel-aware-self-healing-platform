import { useCallback, useEffect, useState } from "react"
import { fetchIncidents } from "@/services/incidents"
import { useWebSocket } from "@/hooks/useWebSocket.js"

const SYSTEM_ID = import.meta.env.VITE_SYSTEM_ID || "1"

function normalizeIncident(value) {
  const detail = value || {}
  const trigger = detail.trigger || {}
  const id = detail.incident_id || detail.id
  const status = String(detail.status || "OPEN").toUpperCase()
  const category = String(detail.monitor_type || detail.category || "unknown").toLowerCase()
  const target = detail.target || detail.process || "Whole System"
  const createdAt = detail.created_at || detail.detected_at || null
  const priority = detail.priority || detail.alert?.priority || "Medium"
  const severity = detail.severity || detail.alert?.severity || "Warning"

  return {
    ...detail,
    id,
    incident_id: id,
    category,
    monitor_type: category,
    target,
    system_id: detail.system_id ?? detail.alert?.system_id,
    system: detail.system || detail.alert?.system || `System ${detail.system_id ?? ""}`,
    title: detail.title || detail.alert?.title || `${trigger.metric || detail.metric || category} - ${target}`,
    priority,
    severity,
    status,
    created_at: createdAt,
    trigger: {
      metric: trigger.metric || detail.metric || detail.alert?.metric || "Unknown metric",
      currentValue: trigger.currentValue ?? detail.current_value ?? detail.alert?.current_value,
      operator: trigger.operator || detail.operator || detail.alert?.operator || "",
      threshold: trigger.threshold ?? detail.threshold ?? detail.alert?.threshold,
      duration: trigger.duration || `${trigger.durationSeconds ?? detail.duration_seconds ?? 0} seconds`,
      durationSeconds: trigger.durationSeconds ?? detail.duration_seconds ?? 0,
    },
    rootCause: detail.rootCause || { verified: false, source: "Monitoring metrics", timeline: [] },
    decision: detail.decision || {},
    policy: detail.policy || {},
    operatorAction: detail.operatorAction || {},
    prio: priority,
    start: createdAt,
    resolved_at: detail.resolved_at || null,
    alert: detail.alert || null,
  }
}

function mergeIncidents(primary, secondary = []) {
  const byId = new Map()
  ;[...primary, ...secondary].forEach(item => {
    const normalized = normalizeIncident(item)
    if (normalized.id) {
      byId.set(normalized.id, {
        ...(byId.get(normalized.id) || {}),
        ...normalized,
      })
    }
  })
  return [...byId.values()].sort((a, b) => {
    const aTime = Date.parse(a.updated_at || a.created_at || 0) || 0
    const bTime = Date.parse(b.updated_at || b.created_at || 0) || 0
    return bTime - aTime
  })
}

export function useIncidents() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const socketIncident = useWebSocket("incident_update")

  useEffect(() => {
    let active = true
    fetchIncidents(SYSTEM_ID)
      .then(rows => {
        if (!active) return
        setIncidents(current => mergeIncidents(rows, current))
        setError("")
      })
      .catch(requestError => {
        if (active) setError(requestError.message || "Unable to load incident history.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!socketIncident) return
    setIncidents(current => mergeIncidents(current, [socketIncident]))
  }, [socketIncident])

  const updateIncident = useCallback((incidentId, updates) => {
    setIncidents(current => current.map(item => item.id === incidentId ? { ...item, ...updates } : item))
  }, [])

  return { incidents, setIncidents, updateIncident, loading, error }
}
