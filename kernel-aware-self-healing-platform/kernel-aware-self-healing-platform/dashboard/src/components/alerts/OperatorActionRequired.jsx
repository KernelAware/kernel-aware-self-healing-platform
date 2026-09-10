import React, { useEffect, useState } from 'react'
import { TriangleAlert } from 'lucide-react'

import {
  Panel,
  PanelHeader
} from '@/components/kit'


export default function OperatorActionRequired({
  selectedIncident,
  approveIncident,
  rejectIncident
}) {

  const [selectedAction, setSelectedAction] = useState('')


  // Update selected action when user selects another incident
  useEffect(() => {
    if (selectedIncident) {
      setSelectedAction(
        selectedIncident.operatorAction?.selectedAction ||
        selectedIncident.operatorAction?.recommendedAction ||
        ''
      )
    }
  }, [selectedIncident])


  // No incident selected
  if (!selectedIncident) {
    return (
      <Panel>
        <PanelHeader
          title="Operator Action Required"
          icon={TriangleAlert}
        />

        <div className="p-4 pt-0">
          <p className="text-xs text-muted-foreground">
            Select an incident to view available actions.
          </p>
        </div>
      </Panel>
    )
  }


  // Auto execution without approval = operator cannot change anything
  const autoExecuting =
    selectedIncident.policy?.automaticExecution === true &&
    selectedIncident.policy?.approvalRequired === false


  const allowedActions =
    selectedIncident.operatorAction?.allowedActions || []


  const recommendedAction =
    selectedIncident.operatorAction?.recommendedAction || ''


  const reason =
    selectedIncident.operatorAction?.reason || ''


  const handleApprove = () => {
    if (autoExecuting) return

    approveIncident?.(
      selectedIncident.id,
      selectedAction
    )
  }


  const handleReject = () => {
    if (autoExecuting) return

    rejectIncident?.(selectedIncident.id)
  }


  return (
    <Panel>

      <PanelHeader
        title="Operator Action Required"
        icon={TriangleAlert}
      />


      <div className="p-4 pt-0">

        {/* MESSAGE */}
        <div
          className={`
            mb-4
            rounded-md
            border
            p-3
            ${
              autoExecuting
                ? 'border-primary/30 bg-primary/5'
                : 'border-border bg-secondary/20'
            }
          `}
        >

          <p className="text-xs text-muted-foreground">
            {autoExecuting
              ? 'Automatic execution is in progress. Operator actions are disabled.'
              : selectedIncident.operatorAction?.message ||
                'Review the recommendation and select an approved remediation action.'
            }
          </p>

        </div>


        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* ACTION SELECT */}
          <div>

            <label className="mb-2 block text-xs font-medium text-foreground">
              Select Remediation Action
            </label>


            <select
              value={selectedAction}
              disabled={autoExecuting}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="
                w-full
                rounded-md
                border
                border-border
                bg-secondary/40
                px-3
                py-2
                text-xs
                text-foreground
                outline-none
                transition
                focus:border-accent
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >

              {allowedActions.map((action) => (
                <option
                  key={action}
                  value={action}
                >
                  {action}
                  {action === recommendedAction
                    ? ' (Recommended)'
                    : ''}
                </option>
              ))}

            </select>


            <p className="mt-2 text-[11px] text-muted-foreground">
              {autoExecuting
                ? 'Action selection is disabled because automatic execution is enabled.'
                : 'Only actions allowed by this rule are shown.'
              }
            </p>

          </div>


          {/* RECOMMENDED ACTION */}
          <div className="rounded-md border border-border bg-secondary/30 p-3">

            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Recommended Action
            </p>


            <p className="mt-1 font-mono text-sm text-primary">
              {recommendedAction}
            </p>


            <p className="mt-1 text-xs text-muted-foreground">

              <span className="text-foreground">
                Reason:
              </span>{' '}

              {reason}

            </p>

          </div>

        </div>


        {/* BUTTONS */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

          {/* APPROVE */}
          <button
            type="button"
            disabled={autoExecuting}
            onClick={handleApprove}
            className="
              rounded-md
              bg-primary
              px-4
              py-2.5
              text-xs
              font-semibold
              text-primary-foreground
              transition
              hover:opacity-90
              disabled:cursor-not-allowed
              disabled:opacity-40
              disabled:hover:opacity-40
            "
          >
            {autoExecuting
              ? 'Auto Executing'
              : 'Approve & Execute'
            }
          </button>


          {/* REJECT */}
          <button
            type="button"
            disabled={autoExecuting}
            onClick={handleReject}
            className="
              rounded-md
              bg-destructive
              px-4
              py-2.5
              text-xs
              font-semibold
              text-destructive-foreground
              transition
              hover:opacity-90
              disabled:cursor-not-allowed
              disabled:opacity-40
              disabled:hover:opacity-40
            "
          >
            Reject
          </button>

        </div>

      </div>

    </Panel>
  )
}