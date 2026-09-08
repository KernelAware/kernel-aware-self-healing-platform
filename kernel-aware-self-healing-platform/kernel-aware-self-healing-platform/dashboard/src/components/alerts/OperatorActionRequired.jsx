import React from 'react'
import { TriangleAlert } from 'lucide-react'

import {
  Panel,
  PanelHeader
} from '@/components/kit'


export default function OperatorActionRequired() {
  return (
    <Panel>

      <PanelHeader
        title="Operator Action Required"
        icon={TriangleAlert}
      />


      <div className="p-4 pt-0">

        <p className="mb-4 text-xs text-muted-foreground">
          Review the recommendation and select an approved remediation action.
        </p>


        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* ACTION SELECT */}
          <div>

            <label className="mb-2 block text-xs font-medium text-foreground">
              Select Remediation Action
            </label>

            <select
              className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
              defaultValue="restart-service"
            >
              <option value="restart-service">
                restart-service (Recommended)
              </option>

              <option value="run-automation">
                run-automation
              </option>

              <option value="send-notification">
                send-notification
              </option>
            </select>

            <p className="mt-2 text-[11px] text-muted-foreground">
              Only actions allowed by this rule are shown.
            </p>

          </div>


          {/* RECOMMENDED ACTION */}
          <div className="rounded-md border border-border bg-secondary/30 p-3">

            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Recommended Action
            </p>

            <p className="mt-1 font-mono text-sm text-primary">
              restart-service
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              <span className="text-foreground">
                Reason:
              </span>{' '}
              CPU usage remained above the configured threshold for 5 minutes.
            </p>

          </div>

        </div>


        {/* BUTTONS */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

          <button className="rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90">
            Approve & Execute
          </button>

          <button className="rounded-md bg-destructive px-4 py-2.5 text-xs font-semibold text-destructive-foreground transition hover:opacity-90">
            Reject
          </button>

        </div>

      </div>

    </Panel>
  )
}