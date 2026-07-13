import React from 'react'
import { ListFilter, Zap } from 'lucide-react'
import { PageHeader, ActionButton, Panel, ProgressBar, CircularGauge } from '@/components/kit'
import ServicesTable from '@/components/process/ServicesTable'
import ProcessesTable from '@/components/process/ProcessesTable'

export default function ProcessPage() {
  return (
    <>
      <PageHeader
        title="Processes & Services Orchestration"
        description="Real-time kernel-level oversight of active sub-systems and binary executions."
        actions={
          <>
            <ActionButton icon={ListFilter}>Filters</ActionButton>
            <ActionButton variant="primary" icon={Zap}>Quick Actions</ActionButton>
          </>
        }
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ServicesTable />

          <div className="flex flex-col gap-4">
            <Panel className="p-4">
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Worker Threads Utilization</p>
              <p className="mt-2 text-4xl font-bold text-primary">84.2%</p>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="mb-1 flex justify-between font-mono text-[11px]"><span className="text-muted-foreground">User Execution</span><span className="text-foreground">62%</span></div>
                  <ProgressBar value={62} tone="success" />
                </div>
                <div>
                  <div className="mb-1 flex justify-between font-mono text-[11px]"><span className="text-muted-foreground">Kernel Execution</span><span className="text-foreground">22.2%</span></div>
                  <ProgressBar value={22} tone="info" />
                </div>
              </div>
            </Panel>

            <Panel className="p-4">
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Heuristic Health Score</p>
              <div className="mt-2 flex items-center gap-4">
                <CircularGauge value={94} tone="success" size={90} />
                <div>
                  <p className="font-mono text-sm text-primary">Status: Excellent</p>
                  <p className="mt-1 text-xs text-muted-foreground text-pretty">Based on 142 service telemetry points and kernel performance metrics.</p>
                </div>
              </div>
            </Panel>
          </div>
        </div>

        <ProcessesTable />
      </div>
    </>
  )
}
