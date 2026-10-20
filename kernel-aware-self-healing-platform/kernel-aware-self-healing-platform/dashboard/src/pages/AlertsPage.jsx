import React from 'react'
import { TriangleAlert } from 'lucide-react'
import { PageHeader, ActionButton } from '@/components/kit'
import ActiveAlertsList from '@/components/alerts/ActiveAlertsList'
import IncidentDetailView from '@/components/alerts/IncidentDetailView'
import IncidentsTable from '@/components/alerts/IncidentsTable'
import { useAlerts } from '@/hooks/useAlerts'
import { useIncidents } from '@/hooks/useIncidents'
import {useIncidentDetails} from "@/hooks/alertDetails.js";

export default function AlertsPage() {
  const { incidents, loading, error } = useIncidents()
  const { alerts, liveIncidents, updateLiveIncident, acknowledgeAlert, criticalCount } = useAlerts({ ruleAlertsOnly: true })
  const { selectedIncident, selectedIncidentId, selectIncident, approveIncident, rejectIncident } = useIncidentDetails(liveIncidents, updateLiveIncident)

  return (
    <>
      <PageHeader
        title="Alerts & Incidents"
        description="Live monitoring alerts and persisted incident history."
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
                h-[730px]
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
                selectIncident={selectIncident}
                selectedIncidentId={selectedIncidentId}
              />
            </div>

          <IncidentDetailView timeline={selectedIncident?.rootCause?.timeline || []} selectedIncident={selectedIncident} approveIncident={approveIncident} rejectIncident={rejectIncident} selectIncident={selectIncident}/>
        </div>

        {loading && <p role="status" className="rounded-md border border-border bg-card px-4 py-3 font-mono text-xs text-muted-foreground">Loading incident history…</p>}
        {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 font-mono text-xs text-destructive">Incident history unavailable: {error}</p>}
        <IncidentsTable incidents={incidents} loading={loading} />

      </div>
    </>
  )
}
