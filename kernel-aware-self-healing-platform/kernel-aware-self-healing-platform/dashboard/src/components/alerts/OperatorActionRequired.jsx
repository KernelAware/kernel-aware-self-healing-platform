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
  const [customActionInputs, setCustomActionInputs] = useState({})
  const [actionLoading, setActionLoading] = useState(null)
  const [showActionScript, setShowActionScript] = useState(false)

  const normalizeAction = (value = '') => String(value)
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const getActionType = (action = {}) => action.action_type || action.actionType || action.type || action.action_name || action.actionName || action.name || ''
  const getActionScript = (action = {}) => action?.action_script ?? '';
  const getActionInputValue = (actionName = '') => customActionInputs[normalizeAction(actionName)] || ''
  const setActionInputValue = (actionName = '', value = '') => {
    const key = normalizeAction(actionName)
    setCustomActionInputs((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    if (selectedIncident) {
      const nextAction =
        selectedIncident.operatorAction?.selectedAction ||
        selectedIncident.operatorAction?.recommendedAction ||
        selectedIncident.decision?.recommendedAction ||
        ''

      setSelectedAction(nextAction)
      setShowActionScript(false)
    }
  }, [selectedIncident])

  useEffect(() => {
    setShowActionScript(false)
  }, [selectedAction])

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
  const normalizedSelectedAction = normalizeAction(selectedAction)
  const selectedAllowedAction = allowedActions.find((action) => {
    const actionType = getActionType(action)
    return Boolean(actionType) && normalizeAction(actionType) === normalizedSelectedAction
  }) || null

  let selectedActionScript = '';

  allowedActions.map((selectedAllowedAction)=>{
    selectedActionScript = selectedAllowedAction.action_script
  })

  const hasSelectedActionScript = typeof selectedActionScript === 'string'
    ? selectedActionScript.trim().length > 0
    : Boolean(selectedActionScript)
  const requiresCustomCommandInput = normalizedSelectedAction === 'run-command'
  const customActionInput = getActionInputValue(selectedAction)

  const isProcessing = processingAction?.id === selectedIncident?.id || actionLoading !== null
  const canInteract = !autoExecuting && !isProcessing

  const handleApprove = async () => {
    if (!canInteract) return
    setActionLoading('approve')

    try {
      await approveIncident?.(selectedIncident.id, selectedAction, selectedIncident, customActionInput)
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
              {allowedActions.map((action) => {
                const actionType = getActionType(action)

                return (
                  <option
                    key={actionType || Math.random().toString(36).slice(2)}
                    value={actionType}
                  >
                    {actionType}
                    {actionType === recommendedAction ? ' (Recommended)' : ''}
                  </option>
                )
              })}
            </select>

            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <p className="flex-1">
                {autoExecuting ? 'Action selection is disabled because automatic execution is enabled.' : 'Only actions allowed by this rule are shown.'}
              </p>
              {(selectedActionScript && (
                <button
                  type="button"
                  className="shrink-0 text-primary underline-offset-2 hover:text-primary/80 underline"
                  onClick={() => setShowActionScript(selectedActionScript)}
                >
                  {showActionScript ? 'Hide script' : 'View script'}
                </button>
              ))}
            </div>

            {showActionScript && hasSelectedActionScript && (
              <div className="mt-2 rounded-md border border-border bg-secondary/20 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Action script</span>
                  <button
                    type="button"
                    className="text-[10px] text-primary underline-offset-2 hover:text-primary/80 underline"
                    onClick={() => setShowActionScript(false)}
                  >
                    Close
                  </button>
                </div>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-foreground">
                  {selectedActionScript}
                </pre>
              </div>
            )}
          </div>

          <div className="rounded-md border border-border bg-secondary/30 p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Recommended Action</p>
            <p className="mt-1 font-mono text-sm text-primary">{recommendedAction}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="text-foreground">Reason:</span> {reason}
            </p>
          </div>
        </div>

        {requiresCustomCommandInput && (
          <div className="mt-4">
            <label className="mb-2 block text-xs font-medium text-foreground">
              Command to run
            </label>
            <textarea
              value={customActionInput}
              onChange={(event) => setActionInputValue(selectedAction, event.target.value)}
              rows={5}
              placeholder='Example: systemctl restart nginx || echo "service restarted"'
              className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs text-foreground outline-none transition focus:border-accent"
            />
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ActionButton
            type="button"
            variant="primary"
            disabled={!canInteract || (requiresCustomCommandInput && !customActionInput.trim())}
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