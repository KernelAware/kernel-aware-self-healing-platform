import React from 'react'
import {
  Activity,
  Server,
  Clock,
  Brain,
  ShieldCheck
} from 'lucide-react'

import {
  Panel,
  PanelHeader
} from '@/components/kit'


export default function IncidentDetailsResponse({ selectedIncident }) {

  if (!selectedIncident) {
    return (
      <Panel>
        <div className="p-6 text-center text-sm text-muted-foreground">
          Select an incident to view details.
        </div>
      </Panel>
    )
  }

  return (
    <Panel>

      <PanelHeader
        title="Incident Details & Response"
        icon={Activity}
        action={
          <span className="font-mono text-[10px] text-muted-foreground">
            Incident ID: {selectedIncident.id}
          </span>
        }
      />


      <div className="p-4 pt-0">

        {/* INCIDENT INFORMATION */}
        <div className="border-b border-border pb-4">

          <div className="flex flex-wrap items-center gap-2">

            <h2 className="text-base font-semibold text-foreground">
              {selectedIncident.title}
            </h2>

            <span className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1 font-mono text-[10px] uppercase text-destructive">
              {selectedIncident.priority} - {selectedIncident.severity}
            </span>

          </div>


          <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">

            <span className="flex items-center gap-1">
              <Server className="size-3" />
              {selectedIncident.system}
            </span>

            <span>
              {selectedIncident.process}
            </span>

            {selectedIncident.pid && (
              <span>
                PID {selectedIncident.pid}
              </span>
            )}

            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              Detected: {selectedIncident.detectedAgo}
            </span>

          </div>

        </div>


        {/* TRIGGER CONDITION */}
        <div className="mt-4 rounded-md border border-border bg-secondary/20">

          <div className="flex items-center gap-2 border-b border-border px-3 py-2">

            <Activity className="size-4 text-accent" />

            <p className="text-xs font-medium text-foreground">
              Trigger Condition
            </p>

          </div>


          <div className="grid grid-cols-2 gap-3 p-3 text-xs md:grid-cols-4">

            <div>
              <p className="text-[10px] text-muted-foreground">
                Metric
              </p>

              <p className="mt-1 text-foreground">
                {selectedIncident.trigger.metric}
              </p>
            </div>


            <div>
              <p className="text-[10px] text-muted-foreground">
                Current Value
              </p>

              <p className="mt-1 font-semibold text-destructive">
                {selectedIncident.trigger.currentValue}
              </p>
            </div>


            <div>
              <p className="text-[10px] text-muted-foreground">
                Threshold
              </p>

              <p className="mt-1 text-foreground">
                {selectedIncident.trigger.operator}{' '}
                {selectedIncident.trigger.threshold}
              </p>
            </div>


            <div>
              <p className="text-[10px] text-muted-foreground">
                Duration
              </p>

              <p className="mt-1 text-foreground">
                {selectedIncident.trigger.duration}
              </p>
            </div>

          </div>

        </div>


        {/* DECISION ENGINE */}
        <div className="mt-3 rounded-md border border-border bg-secondary/20">

          <div className="flex items-center gap-2 border-b border-border px-3 py-2">

            <Brain className="size-4 text-purple-400" />

            <p className="text-xs font-medium text-foreground">
              Decision Engine
            </p>

          </div>


          <div className="grid grid-cols-1 gap-3 p-3 text-xs md:grid-cols-[1fr_1fr_2fr]">

            <div>
              <p className="text-[10px] text-muted-foreground">
                Recommended Action
              </p>

              <p className="mt-1 font-semibold text-primary">
                {selectedIncident.decision.recommendedAction}
              </p>
            </div>


            <div>
              <p className="text-[10px] text-muted-foreground">
                Decision
              </p>

              <p className="mt-1 text-foreground">
                {selectedIncident.decision.decision}
              </p>
            </div>


            <div>
              <p className="text-[10px] text-muted-foreground">
                Reason
              </p>

              <p className="mt-1 text-muted-foreground">
                {selectedIncident.decision.reason}
              </p>
            </div>

          </div>

        </div>


        {/* POLICY CHECK */}
        <div className="mt-3 rounded-md border border-border bg-secondary/20">

          <div className="flex items-center gap-2 border-b border-border px-3 py-2">

            <ShieldCheck className="size-4 text-primary" />

            <p className="text-xs font-medium text-foreground">
              Policy Check
            </p>

          </div>


          <div className="grid grid-cols-2 gap-3 p-3 text-xs md:grid-cols-4">

            <div>
              <p className="text-[10px] text-muted-foreground">
                Rule Enabled
              </p>

              <p className="mt-1 font-semibold text-primary">
                {selectedIncident.policy.ruleEnabled ? '✓ Yes' : '✕ No'}
              </p>
            </div>


            <div>
              <p className="text-[10px] text-muted-foreground">
                Auto Execution
              </p>

              <p className="mt-1 font-semibold text-primary">
                {selectedIncident.policy.automaticExecution ? '✓ Yes' : '✕ No'}
              </p>
            </div>


            <div>
              <p className="text-[10px] text-muted-foreground">
                Approval Required
              </p>

              <p className="mt-1 font-semibold text-warning">
                {selectedIncident.policy.approvalRequired
                  ? '! Required'
                  : '✓ Not Required'}
              </p>
            </div>


            <div>
              <p className="text-[10px] text-muted-foreground">
                Cooldown Passed
              </p>

              <p className="mt-1 font-semibold text-primary">
                {selectedIncident.policy.cooldownPassed ? '✓ Yes' : '✕ No'}
              </p>
            </div>

          </div>

        </div>

      </div>

    </Panel>
  )
}