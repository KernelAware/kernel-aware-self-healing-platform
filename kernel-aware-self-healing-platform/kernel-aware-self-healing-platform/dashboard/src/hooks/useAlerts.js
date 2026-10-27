import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { fetchMonitoringReadiness } from "@/services/incidents"
import {
  currentRunDiskIncidents,
  isCurrentRunDiskIncident,
  isStaleAnalyticsGeneration,
} from "@/services/activeAlertLifecycle"
import { wsBroker } from "@/services/websocket"

const LIVE_INCIDENT_EVENTS = new Set(["opened", "updated", "resolved"])
const USER_RULE_CATEGORIES = new Set(["cpu", "memory", "disk", "process"])

// Live incidents stay in memory across page routes. Disk state is hydrated
// only from the Backend's current-run in-memory snapshot, never from history.
let liveIncidentState = []
const liveIncidentListeners = new Set()
const incidentEventsById = new Map()
let incidentEventVersion = 0
let activeSnapshotState = { status: "idle", error: "" }
let lifecycleVersion = 0
let currentAnalyticsGeneration = null
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

function resetDiskIncidentsForNewLifecycle(generation) {
  lifecycleVersion += 1
  currentAnalyticsGeneration = generation
  incidentEventVersion = 0
  incidentEventsById.clear()
  publishLiveIncidents(liveIncidentState.filter(incident => incidentType(incident) !== "disk"))
  publishActiveSnapshotState({ status: "loading", error: "" })
}

function incidentType(incident) {
  return String(incident?.monitor_type || incident?.incident_type || incident?.category || "")
    .trim()
    .toLowerCase()
}

function incidentId(incident) {
  return incident?.incident_id || incident?.id
}

function reconcileDiskSnapshot(rows, requestVersion, generation) {
  const nextById = new Map()
  liveIncidentState
    .filter(incident => incidentType(incident) !== "disk")
    .forEach(incident => nextById.set(incidentId(incident), incident))

  ;(Array.isArray(rows) ? rows : []).forEach(snapshotIncident => {
    const id = incidentId(snapshotIncident)
    if (!id || !currentRunDiskIncidents([snapshotIncident], generation).length) return
    const lastEvent = incidentEventsById.get(id)
    if (lastEvent?.incident === null) return
    const current = lastEvent?.version > requestVersion ? lastEvent.incident : snapshotIncident
    nextById.set(id, { ...current, id, incident_id: id })
  })

  incidentEventsById.forEach((lastEvent, id) => {
    if (lastEvent.version <= requestVersion || lastEvent.monitorType !== "disk") return
    if (lastEvent.incident === null) nextById.delete(id)
    else nextById.set(id, lastEvent.incident)
  })

  publishLiveIncidents([...nextById.values()])
}

function loadActiveDiskIncidents(readiness, requestContext = {}) {
  if (!readiness?.ready || !readiness.generation) return
  if (activeSnapshotState.status === "loaded") return Promise.resolve()

  const requestVersion = requestContext.eventVersion ?? incidentEventVersion
  const requestLifecycleVersion = requestContext.lifecycleVersion ?? lifecycleVersion
  publishActiveSnapshotState({ status: "loading", error: "" })
  if (requestLifecycleVersion !== lifecycleVersion) return
  if (readiness.generation !== currentAnalyticsGeneration) return
  reconcileDiskSnapshot(readiness.active_alerts, requestVersion, readiness.generation)
  publishActiveSnapshotState({ status: "loaded", error: "" })
}

function handleLiveIncidentMessage(message) {
  if (message?.type === "monitoring_readiness") {
    const generation = message.data?.generation || null
    if (isStaleAnalyticsGeneration(generation, currentAnalyticsGeneration)) return
    if (generation !== currentAnalyticsGeneration) {
      resetDiskIncidentsForNewLifecycle(generation)
    }
    if (message.data?.ready === true) {
      loadActiveDiskIncidents(message.data, {
        lifecycleVersion,
        // WebSocket readiness snapshots are sent before later events on that
        // connection; any same-run event already observed takes precedence.
        eventVersion: -1,
      })
    }
    return
  }

  if (message?.type !== "incident_update" || !LIVE_INCIDENT_EVENTS.has(message.event)) return
  const liveIncident = message.data
  if (!liveIncident) return
  const monitorType = incidentType(liveIncident)
  if (monitorType === "disk" && !isCurrentRunDiskIncident(liveIncident, currentAnalyticsGeneration)) return
  const id = incidentId(liveIncident)
  if (!id) return

  const normalizedIncident = { ...liveIncident, id, incident_id: id }
  const version = ++incidentEventVersion
  if (monitorType === "disk") {
    incidentEventsById.set(id, {
      version,
      monitorType,
      generation: normalizedIncident.analytics_generation,
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
    if (!ruleAlertsOnly) return undefined

    let active = true
    let timer = null
    const checkReadiness = async () => {
      const requestContext = {
        generation: currentAnalyticsGeneration,
        lifecycleVersion,
        eventVersion: incidentEventVersion,
      }
      try {
        const readiness = await fetchMonitoringReadiness(SYSTEM_ID)
        if (!active) return
        if (
          requestContext.generation !== currentAnalyticsGeneration
          || requestContext.lifecycleVersion !== lifecycleVersion
        ) {
          timer = window.setTimeout(checkReadiness, 1500)
          return
        }
        const generation = readiness.generation || null
        if (isStaleAnalyticsGeneration(generation, currentAnalyticsGeneration)) {
          timer = window.setTimeout(checkReadiness, 1500)
          return
        }
        if (generation !== currentAnalyticsGeneration) {
          resetDiskIncidentsForNewLifecycle(generation)
          requestContext.lifecycleVersion = lifecycleVersion
          requestContext.eventVersion = -1
        }
        if (readiness.ready) {
          loadActiveDiskIncidents(readiness, requestContext)
          return
        }
        if (activeSnapshotState.status !== "loading") {
          publishActiveSnapshotState({ status: "loading", error: "" })
        }
      } catch (error) {
        if (!active) return
        publishActiveSnapshotState({
          status: "error",
          error: error.message || "Unable to check Analytics Engine readiness.",
        })
      }
      if (active) timer = window.setTimeout(checkReadiness, 1500)
    }

    checkReadiness()
    return () => {
      active = false
      if (timer != null) window.clearTimeout(timer)
    }
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
