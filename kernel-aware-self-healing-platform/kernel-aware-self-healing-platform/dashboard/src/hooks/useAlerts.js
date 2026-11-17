
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore
} from 'react'

import { fetchMonitoringReadiness } from '@/services/incidents'
import { resolveIncident } from '@/services/api'

import {
  isCurrentRunDiskIncident,
  isStaleAnalyticsGeneration
} from '@/services/activeAlertLifecycle'

import { wsBroker } from '@/services/websocket'
import { getConfiguredSystemId } from '@/services/system'

const LIVE_INCIDENT_EVENTS = new Set([
  'opened',
  'updated',
  'resolved'
])

// All supported user-rule monitoring categories.
const USER_RULE_CATEGORIES = new Set([
  'cpu',
  'memory',
  'disk',
  'process',
  'network',
  'service',
  'services',
  'health',
  'logs'
])

// Live incidents stay in memory across page routes and are populated by events.
let liveIncidentState = []
const liveIncidentListeners = new Set()

let activeSnapshotState = {
  status: 'idle',
  error: ''
}

let lifecycleVersion = 0
let currentAnalyticsGeneration = null

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

  console.debug('DASHBOARD_ACTIVE_ALERT_STATE_UPDATED', {
    count: nextIncidents.length,
    disk_incident_ids: nextIncidents
      .filter(incident => incidentType(incident) === 'disk')
      .map(incident => incidentId(incident))
  })

  liveIncidentListeners.forEach(listener => listener())
}

function publishActiveSnapshotState(nextState) {
  activeSnapshotState = nextState
  liveIncidentListeners.forEach(listener => listener())
}

function resetIncidentsForNewLifecycle(generation) {
  lifecycleVersion += 1
  currentAnalyticsGeneration = generation

  // Active incident state belongs to one Analytics process lifetime.
  publishLiveIncidents([])

  publishActiveSnapshotState({
    status: 'loading',
    error: ''
  })
}

function incidentType(incident) {
  return String(
    incident?.monitor_type ||
    incident?.incident_type ||
    incident?.category ||
    ''
  )
    .trim()
    .toLowerCase()
}

function incidentId(incident) {
  return incident?.incident_id || incident?.id
}

function handleLiveIncidentMessage(message) {
  // Analytics readiness and generation lifecycle.
  if (message?.type === 'monitoring_readiness') {
    const generation = message.data?.generation || null

    if (
      isStaleAnalyticsGeneration(
        generation,
        currentAnalyticsGeneration
      )
    ) {
      return
    }

    if (generation !== currentAnalyticsGeneration) {
      resetIncidentsForNewLifecycle(generation)

      console.info('DASHBOARD_ANALYTICS_GENERATION_CHANGED', {
        generation
      })
    }

    if (message.data?.ready === true) {
      publishActiveSnapshotState({
        status: 'loaded',
        error: ''
      })
    }

    return
  }

  if (
    message?.type !== 'incident_update' ||
    !LIVE_INCIDENT_EVENTS.has(message.event)
  ) {
    return
  }

  const liveIncident = message.data

  if (!liveIncident) return

  const systemId = getConfiguredSystemId()

  if (String(liveIncident.system_id) !== systemId) {
    return
  }

  const monitorType = incidentType(liveIncident)

  // Reject Disk incidents from older Analytics generations.
  if (
    monitorType === 'disk' &&
    !isCurrentRunDiskIncident(
      liveIncident,
      currentAnalyticsGeneration
    )
  ) {
    console.debug('DASHBOARD_INCIDENT_FILTERED', {
      incident_id: liveIncident.incident_id || liveIncident.id,
      fingerprint: liveIncident.fingerprint,
      monitor_type: monitorType,
      incident_generation: liveIncident.analytics_generation,
      current_generation: currentAnalyticsGeneration,
      reason: 'not current Analytics generation'
    })

    return
  }

  const id = incidentId(liveIncident)

  if (!id) {
    if (monitorType === 'disk') {
      console.debug('DASHBOARD_INCIDENT_FILTERED', {
        fingerprint: liveIncident.fingerprint,
        monitor_type: monitorType,
        reason: 'missing incident ID'
      })
    }

    return
  }

  const normalizedIncident = {
    ...liveIncident,
    id,
    incident_id: id
  }

  const index = liveIncidentState.findIndex(
    item => (item.incident_id || item.id) === id
  )

  const startsLiveEntry =
    message.event === 'opened' ||
    (message.event === 'updated' &&
      !['RESOLVED', 'CLOSED'].includes(
        String(normalizedIncident.status).toUpperCase()
      ))

  if (monitorType === 'disk') {
    console.info('DASHBOARD_WEBSOCKET_EVENT_RECEIVED', {
      incident_id: id,
      fingerprint: normalizedIncident.fingerprint,
      monitor_type: monitorType,
      event: message.event,
      status: normalizedIncident.status,
      generation: normalizedIncident.analytics_generation
    })
  }

  if (message.event === 'resolved') {
    if (monitorType === 'disk') {
      // Disk incidents leave the active list when recovery is detected.
      if (index >= 0) {
        publishLiveIncidents(
          liveIncidentState.filter(
            item => (item.incident_id || item.id) !== id
          )
        )
      }
    } else if (index >= 0) {
      publishLiveIncidents(
        liveIncidentState.filter(
          item => (item.incident_id || item.id) !== id
        )
      )
    }

    return
  }

  if (index < 0) {
    if (startsLiveEntry) {
      publishLiveIncidents([
        normalizedIncident,
        ...liveIncidentState
      ])

      if (monitorType === 'disk') {
        console.info('DASHBOARD_INCIDENT_ACCEPTED', {
          incident_id: id,
          fingerprint: normalizedIncident.fingerprint
        })
      }
    } else if (monitorType === 'disk') {
      console.debug('DASHBOARD_INCIDENT_FILTERED', {
        incident_id: id,
        event: message.event,
        reason: 'event does not open an active entry'
      })
    }

    return
  }

  publishLiveIncidents(
    liveIncidentState.map((item, itemIndex) =>
      itemIndex === index
        ? { ...item, ...normalizedIncident }
        : item
    )
  )
}

// Subscribe once to the shared WebSocket broker.
wsBroker.subscribe(handleLiveIncidentMessage)

function ageFor(value) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(value || '')) / 1000)
  )

  if (!Number.isFinite(seconds)) return ''

  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`

  return `${Math.floor(seconds / 86400)}d ago`
}

const toneForSeverity = severity => ({
  critical: 'danger',
  high: 'warning',
  medium: 'muted',
  warning: 'muted',
  low: 'muted'
}[String(severity || '').toLowerCase()] || 'muted')

export function useAlerts({ ruleAlertsOnly = false } = {}) {
  const [acknowledged, setAcknowledged] = useState(() => new Set())
  const [now, setNow] = useState(() => Date.now())
  const systemId = getConfiguredSystemId()

  useEffect(() => {
    wsBroker.connect(systemId)
  }, [systemId])

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(Date.now()),
      1000
    )

    return () => window.clearInterval(timer)
  }, [])

  const snapshotState = useSyncExternalStore(
    subscribeToLiveIncidents,
    getActiveSnapshotState,
    getActiveSnapshotState
  )

  const allLiveIncidents = useSyncExternalStore(
    subscribeToLiveIncidents,
    getLiveIncidents,
    getLiveIncidents
  )

  const liveIncidents = ruleAlertsOnly
    ? allLiveIncidents.filter(incident =>
        String(incident.system_id) === systemId &&
        USER_RULE_CATEGORIES.has(
          String(
            incident.monitor_type ||
            incident.incident_type ||
            incident.category ||
            ''
          )
            .trim()
            .toLowerCase()
        )
      )
    : allLiveIncidents.filter(
        incident => String(incident.system_id) === systemId
      )

  // Track Analytics readiness and generation for current-run Disk event validation.
  useEffect(() => {
    if (!ruleAlertsOnly) return undefined

    let active = true
    let timer = null

    const checkReadiness = async () => {
      const requestContext = {
        generation: currentAnalyticsGeneration,
        lifecycleVersion
      }

      try {
        const readiness = await fetchMonitoringReadiness(systemId)

        if (!active) return

        if (
          requestContext.generation !== currentAnalyticsGeneration ||
          requestContext.lifecycleVersion !== lifecycleVersion
        ) {
          timer = window.setTimeout(checkReadiness, 1500)
          return
        }

        const generation = readiness.generation || null

        if (
          isStaleAnalyticsGeneration(
            generation,
            currentAnalyticsGeneration
          )
        ) {
          timer = window.setTimeout(checkReadiness, 1500)
          return
        }

        if (generation !== currentAnalyticsGeneration) {
          resetIncidentsForNewLifecycle(generation)

          requestContext.lifecycleVersion = lifecycleVersion
        }

        if (readiness.ready) {
          publishActiveSnapshotState({
            status: 'loaded',
            error: ''
          })
          return
        }

        if (activeSnapshotState.status !== 'loading') {
          publishActiveSnapshotState({
            status: 'loading',
            error: ''
          })
        }
      } catch (error) {
        if (!active) return

        publishActiveSnapshotState({
          status: 'error',
          error:
            error.message ||
            'Unable to check Analytics Engine readiness.'
        })
      }

      if (active) {
        timer = window.setTimeout(checkReadiness, 1500)
      }
    }

    checkReadiness()

    return () => {
      active = false

      if (timer != null) {
        window.clearTimeout(timer)
      }
    }
  }, [ruleAlertsOnly, systemId])

  const alerts = useMemo(
    () =>
      liveIncidents
        .filter(
          incident =>
            !['RESOLVED', 'CLOSED'].includes(
              String(incident.status).toUpperCase()
            )
        )
        .map(incident => {
          const original = incident.alert || {}
          const id = incident.incident_id || incident.id

          return {
            ...original,

            id,
            incident_id: id,

            category: incident.category,
            monitor_type: incident.monitor_type,
            incident_type: incident.incident_type,

            target: incident.target,

            metric:
              incident.trigger?.metric ||
              incident.metric,

            current_value:
              incident.trigger?.currentValue ??
              incident.current_value,

            threshold:
              incident.trigger?.threshold ??
              incident.threshold,

            operator:
              incident.trigger?.operator ||
              incident.operator,

            severity: incident.severity,
            priority: incident.priority,
            status: incident.status,
            title: incident.title,
            system: incident.system,
            system_id: incident.system_id,
            process: incident.process,
            pid: incident.pid,

            created_at: incident.created_at,

            age: incident.created_at
              ? ageFor(incident.created_at)
              : original.age || '',

            tone:
              original.tone ||
              toneForSeverity(incident.severity),

            level:
              original.level ||
              `${incident.priority || 'P2'} - ${incident.severity || 'Medium'}`,

            acked: acknowledged.has(id)
          }
        }),
    [liveIncidents, acknowledged, now]
  )

  const acknowledgeAlert = useCallback(id => {
    setAcknowledged(current => {
      const next = new Set(current)
      next.add(id)
      return next
    })
  }, [])

  const updateLiveIncident = useCallback(
    (incidentId, updates) => {
      publishLiveIncidents(
        liveIncidentState.map(incident =>
          (incident.incident_id || incident.id) === incidentId
            ? { ...incident, ...updates }
            : incident
        )
      )
    },
    []
  )

  // Manual resolution is available for non-Disk incidents only.
  // Disk incidents must resolve through their recovery condition.
  const resolveAlert = useCallback(async id => {
    const incident = liveIncidentState.find(
      item => (item.incident_id || item.id) === id
    )

    if (!incident) {
      throw new Error('Incident not found in active alerts.')
    }

    if (incidentType(incident) === 'disk') {
      throw new Error(
        'Disk alerts resolve automatically when their recovery condition is met.'
      )
    }

    await resolveIncident(id)

    publishLiveIncidents(
      liveIncidentState.map(item =>
        (item.incident_id || item.id) === id
          ? {
              ...item,
              status: 'RESOLVED',
              resolved_at: new Date().toISOString()
            }
          : item
      )
    )
  }, [])

  return {
    alerts,
    liveIncidents,
    updateLiveIncident,
    acknowledgeAlert,
    resolveAlert,

    criticalCount: alerts.filter(
      alert => alert.tone === 'danger'
    ).length,

    activeSnapshotLoading:
      snapshotState.status === 'idle' ||
      snapshotState.status === 'loading',

    activeSnapshotError: snapshotState.error
  }
}
