import React from 'react'
import { TriangleAlert } from 'lucide-react'
import { PageHeader, ActionButton } from '@/components/kit'
import ActiveAlertsList from '@/components/alerts/ActiveAlertsList'
import IncidentDetailView from '@/components/alerts/IncidentDetailView'
import IncidentsTable from '@/components/alerts/IncidentsTable'
import { useAlerts } from '@/hooks/useAlerts'
import { useIncidents } from '@/hooks/useIncidents'
import HealingExecution from '@/components/alerts/HealingExecution.jsx'

export default function AlertsPage() {
  const { alerts, acknowledgeAlert, resolveAlert, criticalCount } = useAlerts()
  const { incidents, timeline } = useIncidents()

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

          <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-[300px_minmax(0,1fr)_260px]">
          <div
              className="
                h-[705px]
                overflow-y-auto
                rounded-xl
                border
                border-border
                bg-card/60
                p-0

                [&::-webkit-scrollbar]:w-1.5
                [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:rounded-full
                [&::-webkit-scrollbar-thumb]:bg-border
                hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40
              "
            >
              <ActiveAlertsList
                alerts={alerts}
                acknowledgeAlert={acknowledgeAlert}
                resolveAlert={resolveAlert}
              />
            </div>

          <IncidentDetailView timeline={timeline} />
        </div>

        <IncidentsTable incidents={incidents} />

      </div>
    </>
  )
}