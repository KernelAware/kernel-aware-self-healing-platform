import React from 'react'
import { TriangleAlert } from 'lucide-react'
import { PageHeader, ActionButton } from '@/components/kit'
import ActiveAlertsList from '@/components/alerts/ActiveAlertsList'
import IncidentDetailView from '@/components/alerts/IncidentDetailView'
import IncidentsTable from '@/components/alerts/IncidentsTable'
import { useAlerts } from '@/hooks/useAlerts'
import { useIncidents } from '@/hooks/useIncidents'

export default function AlertsPage() {
  const { alerts, acknowledgeAlert, resolveAlert, criticalCount } = useAlerts()
  const { incidents, timeline } = useIncidents()

  return (
    <>
      <PageHeader
        title="Alerts & Incidents"
        description="Prioritized kernel and application incidents with autonomous root cause analysis."
        actions={<ActionButton variant="primary" icon={TriangleAlert}>{criticalCount} Critical</ActionButton>}
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ActiveAlertsList 
            alerts={alerts} 
            acknowledgeAlert={acknowledgeAlert} 
            resolveAlert={resolveAlert} 
          />

          <IncidentDetailView timeline={timeline} />
        </div>

        <IncidentsTable incidents={incidents} />
      </div>
    </>
  )
}
