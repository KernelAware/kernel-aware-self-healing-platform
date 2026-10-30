import React, { useEffect, useState } from 'react'
import { TriangleAlert } from 'lucide-react'

import {
  ActionButton,
  Panel,
  PanelHeader
} from '@/components/kit'


export default function OperatorActionRequired({
  selectedIncident,
  approveIncident,
  rejectIncident,
  processingAction
}) {
  const [selectedAction, setSelectedAction] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    if (selectedIncident) {
      setSelectedAction(
        selectedIncident.operatorAction?.selectedAction ||
        selectedIncident.operatorAction?.recommendedAction ||
        selectedIncident.decision?.recommendedAction ||
        ''
      )
    }
  }, [selectedIncident])

  if (!selectedIncident) {
    return (
      <Panel>
        <PanelHeader title="Operator Action Required" icon={TriangleAlert} />
        <div className="p-4 pt-0">
          <p className="text-xs text-muted-foreground">Select an incident to view available actions.</p>
        </div>
      </Panel>
    )
  }

  if (selectedIncident.status === 'RESOLVED') {
    return (
      <Panel>
        <PanelHeader title="Operator Action Required" icon={TriangleAlert} />
        <div className="p-4 pt-0 text-xs text-muted-foreground">
          No operator action is required because incident {selectedIncident.id} is resolved.
        </div>
      </Panel>
    )
  }

  const autoExecuting = selectedIncident.policy?.automaticExecution === true && selectedIncident.policy?.approvalRequired === false
  const allowedActions = selectedIncident.operatorAction?.allowedActions || []
  const recommendedAction = selectedIncident.decision?.recommendedAction || selectedIncident.operatorAction?.recommendedAction || ''
  const reason = selectedIncident.decision?.reason || selectedIncident.operatorAction?.reason || ''

  const isProcessing = processingAction?.id === selectedIncident?.id || actionLoading !== null
  const canInteract = !autoExecuting && !isProcessing

  const handleApprove = async () => {
    if (!canInteract) return
    setActionLoading('approve')

    try {
      await approveIncident?.(selectedIncident.id, selectedAction, selectedIncident)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!canInteract) return
    setActionLoading('reject')

    try {
      await rejectIncident?.(selectedIncident.id)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <Panel>
      <PanelHeader title="Operator Action Required" icon={TriangleAlert} />

      <div className="p-4 pt-0">
        <div className={`mb-4 rounded-md border p-3 ${autoExecuting ? 'border-primary/30 bg-primary/5' : 'border-border bg-secondary/20'}`}>
          <p className="text-xs text-muted-foreground">
            {autoExecuting
              ? 'Automatic execution is in progress. Operator actions are disabled.'
              : selectedIncident.operatorAction?.message || 'Review the recommendation and select an approved remediation action.'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-foreground">Select Remediation Action</label>
            <select
              value={selectedAction}
              disabled={autoExecuting || isProcessing}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-foreground outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              {allowedActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                  {action === recommendedAction ? ' (Recommended)' : ''}
                </option>
              ))}
            </select>

            <p className="mt-2 text-[11px] text-muted-foreground">
              {autoExecuting ? 'Action selection is disabled because automatic execution is enabled.' : 'Only actions allowed by this rule are shown.'}
            </p>
          </div>

          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Recommended Action</p>
            <p className="mt-1 font-mono text-sm text-primary">{recommendedAction}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="text-foreground">Reason:</span> {reason}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ActionButton
            type="button"
            variant="primary"
            disabled={!canInteract}
            onClick={handleApprove}
            className="w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
          >
            {actionLoading === 'approve' ? (
              <>
                <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Approving...
              </>
            ) : autoExecuting ? 'Auto Executing' : 'Approve & Execute'}
          </ActionButton>

          <ActionButton
            type="button"
            variant="default"
            disabled={!canInteract}
            onClick={handleReject}
            className="w-full justify-center border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {actionLoading === 'reject' ? (
              <>
                <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Rejecting...
              </>
            ) : 'Reject'}
          </ActionButton>
        </div>
      </div>
    </Panel>
  )
}