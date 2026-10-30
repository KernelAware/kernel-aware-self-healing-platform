import { useEffect, useState } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket.js'
import { getIncidents, resolveIncident } from '@/services/api'

function normalizeIncidentRecord(source) {
  if (!source || typeof source !== 'object') return null
  const raw = source.data && typeof source.data === 'object' ? source.data : source
  const trigger = raw.trigger || raw.metadata?.trigger || {}
  const decision = raw.decision || raw.metadata?.decision || {}
  const rootCause = raw.rootCause || raw.metadata?.rootCause || { timeline: [] }
  const policy = raw.policy || {
    ruleEnabled: true,
    automaticExecution: false,
    approvalRequired: false,
    cooldownPassed: true
  }

  const formattedStatus = raw.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN'
  const priority = raw.priority || raw.prio || 'P2'
  const severity = raw.severity || 'Medium'
  const operatorAction = raw.operatorAction || {
    required: formattedStatus !== 'RESOLVED',
    message: formattedStatus === 'RESOLVED' ? 'Incident resolved.' : 'Review the recommendation and select an approved remediation action.',
    recommendedAction: decision.recommendedAction || 'No action',
    allowedActions: [],
    selectedAction: decision.recommendedAction || 'No action',
    reason: decision.reason || 'No reason provided'
  }

  return {
    id: raw.id || raw.incident_id || 'UNKNOWN',
    title: raw.title || 'Incident detected',
    priority,
    severity,
    system: raw.system || 'unknown',
    process: raw.process || raw.service || 'system',
    pid: raw.pid ?? null,
    detectedAgo: raw.created_at ? new Date(raw.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now',
    trigger,
    decision,
    policy,
    rootCause,
    operatorAction,
    status: formattedStatus,
    created_at: raw.created_at || raw.createdAt || new Date().toISOString(),
    resolved_at: raw.resolved_at || null,
    metadata: raw.metadata || {}
  }
}

export function useIncidentDetails() {
  const [incidents, setIncidents] = useState([])
  const socketIncidents = useWebSocket('incident_detail')

  useEffect(() => {
    let isMounted = true

    getIncidents()
      .then((items) => {
        if (!isMounted) return
        setIncidents(items.map(normalizeIncidentRecord).filter(Boolean))
      })
      .catch(() => {
        if (isMounted) setIncidents([])
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!socketIncidents) return

    const normalized = normalizeIncidentRecord(socketIncidents)
    if (!normalized) return

    setIncidents((prev) => {
      const next = new Map(prev.map((incident) => [incident.id, incident]))
      next.set(normalized.id, normalized)
      return [...next.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    })
  }, [socketIncidents])

  const [selectedIncidentId, setSelectedIncidentId] = useState(null)

  useEffect(() => {
    if (!incidents.length) {
      setSelectedIncidentId(null)
      return
    }

    const firstOpenIncident = incidents.find((incident) => incident.status !== 'RESOLVED') || incidents[0]
    if (!selectedIncidentId || !incidents.some((incident) => incident.id === selectedIncidentId)) {
      setSelectedIncidentId(firstOpenIncident.id)
    }
  }, [incidents, selectedIncidentId])

  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId) || null

  const selectIncident = (id) => {
    setSelectedIncidentId(id)
  }

  const selectAction = (action) => {
    setIncidents((prev) => prev.map((incident) =>
      incident.id === selectedIncidentId
        ? { ...incident, operatorAction: { ...incident.operatorAction, selectedAction: action } }
        : incident
    ))
  }

  const approveIncident = async (id) => {
    try {
      await resolveIncident(id)
      setIncidents((prev) => prev.map((incident) =>
        incident.id === id ? { ...incident, status: 'RESOLVED', resolved_at: new Date().toISOString() } : incident
      ))
    } catch (error) {
      console.error('Failed to approve incident', error)
    }
  }

  const rejectIncident = async (id) => {
    try {
      await resolveIncident(id)
      setIncidents((prev) => prev.map((incident) =>
        incident.id === id ? { ...incident, status: 'RESOLVED', resolved_at: new Date().toISOString() } : incident
      ))
    } catch (error) {
      console.error('Failed to reject incident', error)
    }
  }

  const addIncident = (incident) => {
    setIncidents((prev) => {
      const next = new Map(prev.map((item) => [item.id, item]))
      next.set(incident.id, incident)
      return [...next.values()]
    })
  }

  return {
    selectedIncident,
    selectedIncidentId,
    selectIncident,
    selectAction,
    approveIncident,
    rejectIncident,
    addIncident
  }
}