
import { useEffect, useState } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket.js'
import { getIncidents } from '@/services/api'

function normalizeIncidentRecord(source) {
  if (!source || typeof source !== 'object') return null

  const raw =
    source.data && typeof source.data === 'object'
      ? source.data
      : source

  const trigger =
    raw.trigger ||
    raw.metadata?.trigger ||
    raw.detail?.trigger ||
    {}

  const decision =
    raw.decision ||
    raw.metadata?.decision ||
    {}

  const rootCause =
    raw.rootCause ||
    raw.metadata?.rootCause ||
    { timeline: [] }

  const policy = raw.policy || {
    ruleEnabled: true,
    automaticExecution: false,
    approvalRequired: false,
    cooldownPassed: true
  }

  const formattedStatus =
    String(raw.status || 'OPEN').toUpperCase()

  const priority = raw.priority || raw.prio || 'P2'
  const severity = raw.severity || 'Medium'

  const operatorAction = raw.operatorAction || {
    required: !['RESOLVED', 'CLOSED'].includes(formattedStatus),
    message: formattedStatus === 'RESOLVED'
      ? 'Incident resolved.'
      : 'Review the recommendation and select an approved remediation action.',
    recommendedAction: decision.recommendedAction || '',
    allowedActions: [],
    selectedAction: decision.recommendedAction || '',
    reason: decision.reason || 'No reason provided'
  }

  return {
    ...raw,

    id: raw.id || raw.incident_id || 'UNKNOWN',
    title: raw.title || raw.description || 'Incident detected',

    priority,
    severity,

    system: raw.system || raw.hostname || 'unknown',

    // Keep the original monitoring category information.
    monitor_type:
      raw.monitor_type ||
      raw.category ||
      raw.incident_type ||
      'unknown',

    category:
      raw.category ||
      raw.monitor_type ||
      raw.incident_type ||
      'unknown',

    process: raw.process || raw.service || 'system',
    pid: raw.pid ?? null,

    target:
      raw.target ||
      raw.process ||
      raw.service ||
      null,

    detectedAgo: raw.created_at
      ? new Date(raw.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'now',

    trigger,
    decision,
    policy,
    rootCause,
    operatorAction,

    status: formattedStatus,

    created_at:
      raw.created_at ||
      raw.createdAt ||
      new Date().toISOString(),

    resolved_at: raw.resolved_at || null,

    metadata: raw.metadata || {}
  }
}

export function useIncidentDetails(
  initialIncidents = null,
  updateIncident = () => {}
) {
  const [incidents, setIncidents] = useState(
    Array.isArray(initialIncidents)
      ? initialIncidents.map(normalizeIncidentRecord).filter(Boolean)
      : []
  )

  const [selectedIncidentId, setSelectedIncidentId] = useState(null)

  const socketIncidents = useWebSocket('incident_detail')

  // Support the original HEAD implementation, where incidents
  // are supplied by the parent component.
  useEffect(() => {
    if (Array.isArray(initialIncidents)) {
      setIncidents(
        initialIncidents
          .map(normalizeIncidentRecord)
          .filter(Boolean)
      )
    }
  }, [initialIncidents])

  // Load incidents from the backend when the hook manages
  // its own incident collection.
  useEffect(() => {
    if (Array.isArray(initialIncidents)) return

    let isMounted = true

    getIncidents()
      .then(items => {
        if (!isMounted || !Array.isArray(items)) return

        const normalized = items
          .map(normalizeIncidentRecord)
          .filter(Boolean)

        setIncidents(normalized)
      })
      .catch(error => {
        console.error('Failed to load incidents:', error)

        if (isMounted) {
          setIncidents([])
        }
      })

    return () => {
      isMounted = false
    }
  }, [initialIncidents])

  // Process real-time incident updates from WebSocket.
  useEffect(() => {
    if (!socketIncidents) return

    const normalized = normalizeIncidentRecord(socketIncidents)

    if (!normalized || normalized.id === 'UNKNOWN') return

    setIncidents(prev => {
      const next = new Map(
        prev.map(incident => [incident.id, incident])
      )

      const existing = next.get(normalized.id)

      next.set(normalized.id, {
        ...existing,
        ...normalized
      })

      return [...next.values()].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
    })
  }, [socketIncidents])

  // Keep a valid incident selected.
  // Prefer an open incident when the current selection disappears.
  useEffect(() => {
    if (incidents.length === 0) {
      setSelectedIncidentId(null)
      return
    }

    const selectedStillExists = incidents.some(
      incident => incident.id === selectedIncidentId
    )

    if (!selectedIncidentId || !selectedStillExists) {
      const firstOpenIncident =
        incidents.find(
          incident =>
            !['RESOLVED', 'CLOSED'].includes(incident.status)
        ) || incidents[0]

      setSelectedIncidentId(firstOpenIncident.id)
    }
  }, [incidents, selectedIncidentId])

  const selectedIncident =
    incidents.find(
      incident => incident.id === selectedIncidentId
    ) || null

  const selectIncident = id => {
    setSelectedIncidentId(id)
  }

  // Update the selected remediation action.
  const selectAction = action => {
    if (!selectedIncidentId) return

    setIncidents(prev =>
      prev.map(incident =>
        incident.id === selectedIncidentId
          ? {
              ...incident,
              operatorAction: {
                ...incident.operatorAction,
                selectedAction: action
              }
            }
          : incident
      )
    )

    updateIncident(selectedIncidentId, {
      operatorAction: {
        ...selectedIncident?.operatorAction,
        selectedAction: action
      }
    })
  }

  // Approving an action is NOT the same as resolving an incident.
  // Actual execution should be handled by the approval endpoint.
  const approveIncident = async (
    id,
    action,
    incident,
    customActionInput
  ) => {
    if (!id || !action) return

    const updatedIncident = incidents.find(
      item => item.id === id
    )

    if (!updatedIncident) return

    updateIncident(id, {
      status: 'HEALING',
      operatorAction: {
        ...updatedIncident.operatorAction,
        selectedAction: action
      }
    })

    setIncidents(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              status: 'HEALING',
              operatorAction: {
                ...item.operatorAction,
                selectedAction: action
              }
            }
          : item
      )
    )

    // The parent/backend integration must perform the actual
    // approval and remediation execution.
    return {
      id,
      action,
      incident: incident || updatedIncident,
      customActionInput
    }
  }

  // Rejecting an action must not resolve the incident.
  const rejectIncident = async id => {
    if (!id) return

    const updatedIncident = incidents.find(
      item => item.id === id
    )

    if (!updatedIncident) return

    updateIncident(id, {
      status: 'REJECTED'
    })

    setIncidents(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              status: 'REJECTED'
            }
          : item
      )
    )
  }

  // Add an incident received from another component.
  const addIncident = incident => {
    const normalized = normalizeIncidentRecord(incident)

    if (!normalized || normalized.id === 'UNKNOWN') return

    setIncidents(prev => {
      const next = new Map(
        prev.map(item => [item.id, item])
      )

      next.set(normalized.id, {
        ...next.get(normalized.id),
        ...normalized
      })

      return [...next.values()].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
    })
  }

  return {
    incidents,
    selectedIncident,
    selectedIncidentId,
    selectIncident,
    selectAction,
    approveIncident,
    rejectIncident,
    addIncident
  }
}
