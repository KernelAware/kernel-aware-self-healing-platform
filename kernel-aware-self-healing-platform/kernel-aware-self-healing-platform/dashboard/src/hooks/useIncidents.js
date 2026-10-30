import { useEffect, useState } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket.js'
import { getIncidents } from '@/services/api'

function formatDisplayDate(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function formatResolvedDuration(start, resolvedAt) {
  if (!start || !resolvedAt) return '--'
  const startTs = new Date(start).getTime()
  const endTs = new Date(resolvedAt).getTime()
  if (Number.isNaN(startTs) || Number.isNaN(endTs)) return '--'
  const diffSeconds = Math.max(0, Math.floor((endTs - startTs) / 1000))
  if (diffSeconds < 60) return `${diffSeconds}s`
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ${diffSeconds % 60}s`
  return `${Math.floor(diffSeconds / 3600)}h ${Math.floor((diffSeconds % 3600) / 60)}m`
}

function normalizeIncidentPayload(source) {
  if (!source || typeof source !== 'object') return null
  const raw = source.data && typeof source.data === 'object' ? source.data : source
  const trigger = raw.trigger || raw.metadata?.trigger || {}
  const decision = raw.decision || raw.metadata?.decision || {}
  const rootCause = raw.rootCause || raw.metadata?.rootCause || { timeline: [] }
  const policy = raw.policy || { ruleEnabled: true, automaticExecution: false, approvalRequired: false, cooldownPassed: true }
  const operatorAction = raw.operatorAction || {
    required: raw.status !== 'RESOLVED',
    message: raw.status === 'RESOLVED' ? 'Incident resolved.' : 'Review the recommendation and select an approved remediation action.',
    recommendedAction: decision.recommendedAction || 'No action',
    allowedActions: [],
    selectedAction: decision.recommendedAction || 'No action',
    reason: decision.reason || 'No reason provided'
  }

  const priority = raw.priority || raw.level?.split(' - ')[0] || 'P2'
  const severity = raw.severity || raw.level?.split(' - ')[1] || 'Medium'
  const status = raw.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN'

  return {
    id: raw.id || raw.incident_id || 'UNKNOWN',
    title: raw.title || 'Incident detected',
    prio: priority,
    priority,
    severity,
    status,
    start: formatDisplayDate(raw.created_at || raw.createdAt),
    res: raw.resolved_at ? formatDisplayDate(raw.resolved_at) : status === 'RESOLVED' ? 'Resolved' : '--',
    description: raw.description || raw.body || decision.reason || 'Incident description unavailable',
    system: raw.system || 'unknown',
    process: raw.process || raw.service || 'system',
    pid: raw.pid ?? null,
    metric: raw.metric || trigger.metric || 'Unknown metric',
    trigger,
    decision,
    policy,
    rootCause,
    operatorAction,
    created_at: raw.created_at || raw.createdAt || new Date().toISOString(),
    resolved_at: raw.resolved_at || null,
    raised_by: raw.raised_by || null,
    metadata: raw.metadata || {}
  }
}

export function useIncidents() {
  const [incidents, setIncidents] = useState([])
  const [timeline, setTimeline] = useState([])
  const socketIncident = useWebSocket('incident_detail')

  useEffect(() => {
    let isMounted = true

    getIncidents()
      .then((items) => {
        if (!isMounted) return
        const normalized = items.map(normalizeIncidentPayload).filter(Boolean)
        setIncidents(normalized)
        if (normalized[0]?.rootCause?.timeline?.length) {
          setTimeline(normalized[0].rootCause.timeline)
        }
      })
      .catch(() => {
        if (isMounted) {
          setIncidents([])
          setTimeline([])
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!socketIncident) return

    const normalized = normalizeIncidentPayload(socketIncident)
    if (!normalized) return

    setIncidents((prev) => {
      const next = new Map(prev.map((incident) => [incident.id, incident]))
      next.set(normalized.id, normalized)
      return [...next.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    })

    if (normalized.rootCause?.timeline?.length) {
      setTimeline(normalized.rootCause.timeline)
    }
  }, [socketIncident])

  return {
    incidents,
    timeline,
    setIncidents,
    setTimeline
  }
}