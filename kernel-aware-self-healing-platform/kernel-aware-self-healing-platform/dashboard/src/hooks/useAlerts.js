import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { fetchIncidents } from "@/services/incidents"
import { wsBroker } from "@/services/websocket"

const LIVE_INCIDENT_EVENTS = new Set(["opened", "updated", "resolved"])
const USER_RULE_CATEGORIES = new Set(["cpu", "memory", "disk", "process"])

// Live incidents remain in memory for this page session so route changes do
// not discard WebSocket events. This store is never hydrated from history or
// browser storage.
let liveIncidentState = []
const liveIncidentListeners = new Set()
const incidentEventsById = new Map()
let incidentEventVersion = 0
let activeSnapshotRequest = null
let activeSnapshotState = { status: "idle", error: "" }
const SYSTEM_ID = import.meta.env.VITE_SYSTEM_ID || "1"

function subscribeToLiveIncidents(listener) {
  liveIncidentListeners.add(listener)
  return () => liveIncidentListeners.delete(listener)
}

function getLiveIncidents() {
  return liveIncidentState
}

function getActiveSnapshotState() {
  return activeSnapshotState
}

function publishLiveIncidents(nextIncidents) {
  liveIncidentState = nextIncidents
  liveIncidentListeners.forEach(listener => listener())
}

function publishActiveSnapshotState(nextState) {
  activeSnapshotState = nextState
  liveIncidentListeners.forEach(listener => listener())
}

function incidentType(incident) {
  return String(incident?.monitor_type || incident?.incident_type || incident?.category || "")
    .trim()
    .toLowerCase()
}

function incidentId(incident) {
  return incident?.incident_id || incident?.id
}

function reconcileDiskSnapshot(rows, requestVersion) {
  const nextById = new Map()
  liveIncidentState
    .filter(incident => incidentType(incident) !== "disk")
    .forEach(incident => nextById.set(incidentId(incident), incident))

  ;(Array.isArray(rows) ? rows : []).forEach(snapshotIncident => {
    const id = incidentId(snapshotIncident)
    if (!id || incidentType(snapshotIncident) !== "disk") return
    if (["RESOLVED", "CLOSED"].includes(String(snapshotIncident.status).toUpperCase())) return
    const lastEvent = incidentEventsById.get(id)
    if (lastEvent?.incident === null) return
    const current = lastEvent?.version > requestVersion ? lastEvent.incident : snapshotIncident
    nextById.set(id, { ...current, id, incident_id: id })
  })

  incidentEventsById.forEach((lastEvent, id) => {
    if (lastEvent.version <= requestVersion || incidentType(lastEvent.incident) !== "disk") return
    if (lastEvent.incident === null) nextById.delete(id)
    else nextById.set(id, lastEvent.incident)
  })

  publishLiveIncidents([...nextById.values()])
}

function loadActiveDiskIncidents() {
  if (activeSnapshotState.status === "loaded") return Promise.resolve()
  if (activeSnapshotRequest) return activeSnapshotRequest

  const requestVersion = incidentEventVersion
  publishActiveSnapshotState({ status: "loading", error: "" })
  activeSnapshotRequest = fetchIncidents(SYSTEM_ID, { monitorType: "disk", status: "OPEN" })
    .then(rows => {
      reconcileDiskSnapshot(rows, requestVersion)
      publishActiveSnapshotState({ status: "loaded", error: "" })
    })
    .catch(error => {
      // Leave the current live list intact when the authoritative snapshot is unavailable.
      publishActiveSnapshotState({ status: "error", error: error.message || "Unable to restore current incidents." })
    })
    .finally(() => {
      activeSnapshotRequest = null
    })
  return activeSnapshotRequest
}

function handleLiveIncidentMessage(message) {
  if (message?.type !== "incident_update" || !LIVE_INCIDENT_EVENTS.has(message.event)) return
  const liveIncident = message.data
  if (!liveIncident) return
  const monitorType = incidentType(liveIncident)
  const id = incidentId(liveIncident)
  if (!id) return

  const normalizedIncident = { ...liveIncident, id, incident_id: id }
  const version = ++incidentEventVersion
  if (monitorType === "disk") {
    incidentEventsById.set(id, {
      version,
      incident: message.event === "resolved" ? null : normalizedIncident,
    })
  }
  const index = liveIncidentState.findIndex(item => (item.incident_id || item.id) === id)
  const startsLiveEntry = message.event === "opened"
    || (monitorType === "disk" && message.event === "updated")

  if (message.event === "resolved") {
    if (monitorType === "disk") {
      if (index >= 0) publishLiveIncidents(liveIncidentState.filter(item => (item.incident_id || item.id) !== id))
    } else if (index >= 0) {
      publishLiveIncidents(liveIncidentState.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...normalizedIncident } : item,
      ))
    }
    return
  }

  if (index < 0) {
    if (startsLiveEntry) publishLiveIncidents([normalizedIncident, ...liveIncidentState])
    return
  }
  publishLiveIncidents(liveIncidentState.map((item, itemIndex) =>
    itemIndex === index ? { ...item, ...normalizedIncident } : item,
  ))
}

wsBroker.subscribe(handleLiveIncidentMessage)

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
  const snapshotState = useSyncExternalStore(
    subscribeToLiveIncidents,
    getActiveSnapshotState,
    getActiveSnapshotState,
  )
  const allLiveIncidents = useSyncExternalStore(
    subscribeToLiveIncidents,
    getLiveIncidents,
    getLiveIncidents,
  )
  const liveIncidents = ruleAlertsOnly
    ? allLiveIncidents.filter(incident => USER_RULE_CATEGORIES.has(
      String(incident.monitor_type || incident.incident_type || incident.category || "").trim().toLowerCase(),
    ))
    : allLiveIncidents

  useEffect(() => {
    if (ruleAlertsOnly) loadActiveDiskIncidents()
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
    publishLiveIncidents(liveIncidentState.map(incident =>
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
    activeSnapshotLoading: snapshotState.status === "idle" || snapshotState.status === "loading",
    activeSnapshotError: snapshotState.error,
  }
}
