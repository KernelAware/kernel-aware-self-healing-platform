import React, { useEffect, useMemo, useState } from 'react'
import { LoaderCircle, TriangleAlert } from 'lucide-react'
import { PageHeader, ActionButton } from '@/components/kit'
import ActiveAlertsList from '@/components/alerts/ActiveAlertsList'
import IncidentDetailView from '@/components/alerts/IncidentDetailView'
import IncidentsTable from '@/components/alerts/IncidentsTable'
import { useWebSocket } from '@/hooks/useWebSocket'
import { getIncidents, resolveIncident, triggerHealingAction } from '@/services/api'

const SYSTEM_ID = 2

function normalizeIncidentRecord(raw = {}) {
  const payload = raw && typeof raw === 'object' && raw.data && typeof raw.data === 'object' ? raw.data : raw
  const status = payload.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN'
  const priority = payload.priority || payload.prio || 'P2'
  const severity = payload.severity || 'Medium'
  const createdAt = payload.created_at || payload.createdAt || new Date().toISOString()
  const detail = payload.detail || {}
  const alert = payload.alert || {}
  const decision = detail.decision || payload.decision || {}
  const operatorAction = payload.operatorAction || detail.operatorAction || payload.operator_action || {
    required: status !== 'RESOLVED',
    message: status === 'RESOLVED' ? 'Incident resolved.' : 'Review the recommendation and select an approved remediation action.',
    recommendedAction: decision.recommendedAction || 'No action',
    allowedActions: [],
    selectedAction: decision.recommendedAction || 'No action',
    reason: decision.reason || 'No reason provided'
  }

  return {
    id: payload.id || payload.incident_id || 'UNKNOWN',
    title: alert.title || detail.title || 'Incident detected',
    prio: priority,
    priority,
    severity,
    status,
    start: new Date(createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    res: payload.resolved_at ? new Date(payload.resolved_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : status === 'RESOLVED' ? 'Resolved' : '--',
    description: payload.description || payload.body || detail.description || decision.reason || 'Incident description unavailable',
    system: detail.system || payload.system || 'unknown',
    process: alert.process || detail.process || payload.service || 'system',
    pid: payload.pid ?? detail.pid ?? null,
    metric: payload.metric || detail.metric || payload.trigger?.metric || 'Unknown metric',
    trigger: detail.trigger || payload.trigger || {},
    decision,
    policy: payload.policy || detail.policy || { ruleEnabled: true, automaticExecution: false, approvalRequired: false, cooldownPassed: true },
    rootCause: payload.rootCause || detail.rootCause || payload.metadata?.rootCause || { timeline: [] },
    operatorAction,
    created_at: createdAt,
    resolved_at: payload.resolved_at || null,
    metadata: payload.metadata || {},
    acked: false
  }
}

function normalizeAlertRecord(incident) {

  const status = incident.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN'

  return {
    id: incident.id,
    level: `${incident.priority || 'P2'} - ${incident.severity || 'Medium'}`,
    tone: /critical|p0/i.test(incident.priority || incident.severity || '') ? 'danger' : /high|p1/i.test(incident.priority || incident.severity || '') ? 'warning' : 'muted',
    age: incident.created_at ? new Date(incident.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'now',
    title: incident.title || 'Incident detected',
    body: incident.description || 'Incident detected',
    acked: incident.acked || false,
    status,
    system: incident.system || 'unknown',
    process: incident.process || 'system',
    pid: incident.pid ?? null,
    priority: incident.priority || 'P2',
    severity: incident.severity || 'Medium',
    metric: incident.metric || 'Threshold violation detected',
    created_at: incident.created_at || new Date().toISOString(),
    updatedAt: incident.updated_at || incident.created_at || new Date().toISOString()
  }
}

export default function AlertsPage() {
  const [incidents, setIncidents] = useState([])
  const [selectedIncidentId, setSelectedIncidentId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [processingAction, setProcessingAction] = useState({ id: null, type: null })
  const socketAlert = useWebSocket('alerts')
  const socketIncident = useWebSocket('incident_detail')

  useEffect(() => {
    let isMounted = true

    getIncidents(SYSTEM_ID)
      .then((items) => {
        if (!isMounted) return

        const normalized = (Array.isArray(items) ? items : []).map(normalizeIncidentRecord).filter(Boolean)

        setIncidents(normalized)

        const firstOpen = normalized.find((item) => item.status !== 'RESOLVED') || normalized[0]
        setSelectedIncidentId(firstOpen?.id || null)
        setIsLoading(false)
      })
      .catch(() => {
        if (isMounted) {
          setIncidents([])
          setSelectedIncidentId(null)
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!socketIncident) return

    const normalized = normalizeIncidentRecord(socketIncident)
    if (!normalized) return

    setIncidents((prev) => {
      const next = new Map(prev.map((item) => [item.id, item]))
      const existing = next.get(normalized.id)
      next.set(normalized.id, { ...(existing || {}), ...normalized })
      return [...next.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    })

    if (!selectedIncidentId) {
      setSelectedIncidentId(normalized.id)
    }
  }, [socketIncident, selectedIncidentId])

  useEffect(() => {
    if (!socketAlert) return

    const nextAlert = normalizeAlertRecord(socketAlert)
    if (!nextAlert) return

    setIncidents((prev) => {
      const next = new Map(prev.map((item) => [item.id, item]))
      const existing = next.get(nextAlert.id)
      if (!existing) return prev

      next.set(existing.id, {
        ...existing,
        status: nextAlert.status,
        priority: nextAlert.priority,
        severity: nextAlert.severity,
        updated_at: nextAlert.updatedAt || existing.updated_at || new Date().toISOString(),
        description: nextAlert.body || existing.description,
        metric: nextAlert.metric || existing.metric,
      })

      return [...next.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    })
  }, [socketAlert])

  const alerts = useMemo(
    () => incidents.filter((incident) => incident.status !== 'RESOLVED').map(normalizeAlertRecord),
    [incidents]
  )

  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId) || null
  const timeline = selectedIncident?.rootCause?.timeline || []
  const criticalCount = alerts.filter((alert) => /critical|p0/i.test(alert.level)).length

  const selectIncident = (id) => setSelectedIncidentId(id)

  const acknowledgeAlert = (id) => {
    setIncidents((prev) => prev.map((incident) => (incident.id === id ? { ...incident, acked: true } : incident)))
  }

  const resolveAlert = async (id) => {
    try {
      await resolveIncident(id)
      setIncidents((prev) => prev.map((incident) =>
        incident.id === id
          ? { ...incident, status: 'RESOLVED', resolved_at: new Date().toISOString(), acked: true }
          : incident
      ))
    } catch (error) {
      console.error('Failed to resolve alert', error)
    }
  }

  const approveIncident = async (id, action = 'restart_service') => {
    if (!id || processingAction.id) return

    const selected = incidents.find((incident) => incident.id === id)
    const payload = {
      action: String(action || 'restart_service').trim() || 'restart_service',
      target: selected?.process || selected?.system || 'nginx',
      system_id: Number(selected?.system_id ?? SYSTEM_ID ?? 1)
    }

    setProcessingAction({ id, type: 'approve' })

    try {
      await triggerHealingAction(id, payload)
      await resolveIncident(id)
      setIncidents((prev) => prev.map((incident) =>
        incident.id === id
          ? {
              ...incident,
              status: 'RESOLVED',
              resolved_at: new Date().toISOString(),
              acked: true,
            }
          : incident
      ))
      setSelectedIncidentId((prevId) => (prevId === id ? null : prevId))
    } catch (error) {
      console.error('Failed to approve incident', error)
    } finally {
      setProcessingAction({ id: null, type: null })
    }
  }

  const rejectIncident = async (id) => {
    if (!id || processingAction.id) return

    setProcessingAction({ id, type: 'reject' })

    try {
      await resolveIncident(id)
      setIncidents((prev) => prev.map((incident) =>
        incident.id === id
          ? { ...incident, status: 'RESOLVED', resolved_at: new Date().toISOString() }
          : incident
      ))
      setSelectedIncidentId((prevId) => (prevId === id ? null : prevId))
    } catch (error) {
      console.error('Failed to reject incident', error)
    } finally {
      setProcessingAction({ id: null, type: null })
    }
  }

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Alerts & Incidents"
          description="Prioritized kernel and application incidents with autonomous root cause analysis."
          actions={
            <ActionButton variant="primary" icon={TriangleAlert}>
              Loading...
            </ActionButton>
          }
        />

        <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-border bg-card/60">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <LoaderCircle className="size-5 animate-spin text-primary" />
            Loading system {SYSTEM_ID} incidents...
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Alerts & Incidents"
        description="Prioritized kernel and application incidents with autonomous root cause analysis."
        actions={
          <ActionButton variant="primary" icon={TriangleAlert}>
            {criticalCount} Critical
          </ActionButton>
        }
      />

      <div className="space-y-4">
        <div className="grid h-auto grid-cols-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)_260px]">
          <div
            className={
              `overflow-y-auto rounded-xl border border-border bg-card/60 p-0 ` +
              (alerts.length > 0
                ? 'h-[730px] max-h-[730px]'
                : 'min-h-[160px] max-h-[420px]') +
              ' [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40'
            }
          >
            <ActiveAlertsList
              alerts={alerts}
              acknowledgeAlert={acknowledgeAlert}
              resolveAlert={resolveAlert}
              selectIncident={selectIncident}
              selectedIncidentId={selectedIncidentId}
            />
          </div>

          <IncidentDetailView
            timeline={timeline}
            selectedIncident={selectedIncident}
            approveIncident={approveIncident}
            rejectIncident={rejectIncident}
            selectIncident={selectIncident}
            processingAction={processingAction}
          />
        </div>

        <IncidentsTable incidents={incidents} />
      </div>
    </>
  )
}