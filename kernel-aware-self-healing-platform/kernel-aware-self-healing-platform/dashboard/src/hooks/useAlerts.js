import { useEffect, useState } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket.js'
import { getOpenIncidents, resolveIncident } from '@/services/api'

function getToneFromSeverity(level, severity) {
  const value = severity || level || ''
  if (/critical|p0/i.test(value)) return 'danger'
  if (/high|p1/i.test(value)) return 'warning'
  if (/medium|p2/i.test(value)) return 'muted'
  return 'muted'
}

function formatAge(createdAt) {
  if (!createdAt) return 'now'
  const timestamp = new Date(createdAt).getTime()
  if (Number.isNaN(timestamp)) return 'now'
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (diffSeconds < 60) return 'now'
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`
  return `${Math.floor(diffSeconds / 86400)}d ago`
}

function normalizeAlertPayload(source) {
  console.log(source)
  if (!source || typeof source !== 'object') return null
  const normalized = source.data && typeof source.data === 'object' ? source.data : source
  const id = normalized.id || normalized.incident_id || 'UNKNOWN'
  const priority = normalized.priority || normalized.level?.split(' - ')[0] || 'P2'
  const severity = normalized.severity || normalized.level?.split(' - ')[1] || 'Medium'
  const status = normalized.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN'

  return {
    id,
    level: `${priority} - ${severity}`,
    tone: getToneFromSeverity(priority, severity),
    age: formatAge(normalized.created_at || normalized.createdAt),
    title: normalized.title || 'Incident detected',
    body: normalized.description || normalized.body || normalized.metric || 'Incident detected',
    acked: false,
    status,
    system: normalized.system || 'unknown',
    process: normalized.process || normalized.service || normalized.title || 'system',
    pid: normalized.pid ?? null,
    priority,
    severity,
    metric: normalized.metric || normalized.trigger?.metric || null,
    created_at: normalized.created_at || normalized.createdAt || new Date().toISOString()
  }
}

export function useAlerts() {
  const [alerts, setAlerts] = useState([])
  const socketAlert = useWebSocket('alerts')

  useEffect(() => {
    let isMounted = true

    getOpenIncidents()
      .then((items) => {
        if (!isMounted) return
        setAlerts(items.map(normalizeAlertPayload).filter(Boolean))
      })
      .catch(() => {
        if (isMounted) setAlerts([])
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!socketAlert) return

    const normalized = normalizeAlertPayload(socketAlert)
    if (!normalized) return

    setAlerts((prev) => {
      const next = new Map(prev.map((alert) => [alert.id, alert]))
      if (normalized.status === 'RESOLVED') {
        next.delete(normalized.id)
      } else {
        next.set(normalized.id, normalized)
      }
      return [...next.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    })
  }, [socketAlert])

  const acknowledgeAlert = (id) => {
    setAlerts((prev) => prev.map((alert) => (alert.id === id ? { ...alert, acked: true } : alert)))
  }

  const resolveAlert = async (id) => {
    try {
      await resolveIncident(id)
      setAlerts((prev) => prev.filter((alert) => alert.id !== id))
    } catch (error) {
      console.error('Failed to resolve alert', error)
    }
  }

  return {
    alerts,
    setAlerts,
    acknowledgeAlert,
    resolveAlert,
    criticalCount: alerts.filter((alert) => alert.tone === 'danger').length
  }
}