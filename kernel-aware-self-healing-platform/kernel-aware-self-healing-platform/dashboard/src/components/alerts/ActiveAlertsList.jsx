import React from 'react'
import {
  TriangleAlert,
  HardDrive,
  Activity,
  ChevronRight
} from 'lucide-react'

import {
  Panel,
  PanelHeader,
  StatusBadge
} from '@/components/kit'


export default function ActiveAlertsList({
  alerts,
  acknowledgeAlert,
  selectIncident,
  selectedIncidentId,
  activeSnapshotLoading = false,
  activeSnapshotError = "",
}) {

  const activeCount = alerts.length

  return (
    <Panel>

      <PanelHeader
        title="Active Incidents"
        icon={TriangleAlert}
        action={
          <span className="font-mono text-[10px] text-muted-foreground">
            {activeCount} Active
          </span>
        }
      />


      <div className="flex flex-col gap-5 p-3 pt-0">

        {alerts.map((a) => {
          const isSelected = a.id === selectedIncidentId
          const isCritical = a.tone === 'danger'
          const isWarning = a.tone === 'warning'

          return (
            <div
              key={a.id}
              onClick={() => selectIncident(a.id)}
              className={`
                cursor-pointer
                rounded-lg
                border
                p-3
                transition
                hover:bg-secondary/50
                ${
                  isSelected
                    ? 'border-yellow-500 bg-yellow-500/5':""
                }
              `}
            >

              {/* TOP ROW */}
              <div className="flex items-center justify-between">

                <StatusBadge tone={a.tone}>
                  {a.level}
                </StatusBadge>

                <span className="font-mono text-[10px] text-muted-foreground">
                  {a.age}
                </span>

              </div>


              {/* TITLE */}
              <h4 className="mt-2 text-sm font-semibold text-foreground">
                {a.title}
              </h4>

              <span className="mt-1 inline-block font-mono text-[9px] uppercase tracking-wider text-primary">
                {a.category || 'unknown category'}
              </span>


              {/* DETAILS */}
              <div className="mt-3 space-y-1.5 text-[14px] text-muted-foreground">




                <div className="flex items-center gap-2">
                  <HardDrive className="size-5 shrink-0" />
                  <span>
                    {a.target || a.process || a.body}
                  </span>
                </div>


                <div className="flex items-center gap-2">
                  <Activity className="size-3 shrink-0" />
                  <span>
                    {a.metric || 'Threshold violation detected'}
                  </span>
                </div>

              </div>


              {/* STATUS */}
              <div className="mt-3 flex items-center justify-between">

                <div>
                  {a.acked ? (

                    <span className="rounded border border-border bg-secondary px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      Acknowledged
                    </span>

                  ) : (

                    <span
                      className={`
                        rounded
                        border
                        px-2
                        py-1
                        font-mono
                        text-[9px]
                        uppercase
                        tracking-wider
                        ${
                          isCritical
                            ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
                            : isWarning
                              ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                              : 'border-border bg-secondary text-muted-foreground'
                        }
                      `}
                    >
                      {a.status === 'WAITING_APPROVAL'
                        ? 'Waiting Approval'
                        : a.status === 'HEALING'
                          ? 'Healing'
                          : String(a.status).toUpperCase() === 'RESOLVED'
                            ? 'Resolved'
                            : 'Open'}
                    </span>

                  )}
                </div>


                <ChevronRight className="size-4 text-muted-foreground" />

              </div>


              {/* OPTIONAL ACTION BUTTONS */}
              {!a.acked && (
                <div className="mt-3 flex gap-2">

                  <button
                    onClick={() => acknowledgeAlert(a.id)}
                    className="
                      flex-1
                      rounded-md
                      border
                      border-border
                      bg-secondary/40
                      py-1.5
                      font-mono
                      text-[10px]
                      uppercase
                      tracking-wider
                      text-foreground
                      hover:bg-secondary
                    "
                  >
                    Acknowledge
                  </button>


                </div>
              )}

            </div>
          )
        })}


        {activeSnapshotLoading && alerts.length === 0 && (
          <div role="status" className="py-6 text-center font-mono text-xs text-muted-foreground">
            Loading current incidents…
          </div>
        )}

        {activeSnapshotError && (
          <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 font-mono text-[10px] text-destructive">
            Current Disk incidents could not be restored: {activeSnapshotError}
          </div>
        )}

        {alerts.length === 0 && !activeSnapshotLoading && !activeSnapshotError && (

          <div className="py-6 text-center font-mono text-xs text-muted-foreground">
            No active incidents detected.
          </div>

        )}

      </div>

    </Panel>
  )
}
