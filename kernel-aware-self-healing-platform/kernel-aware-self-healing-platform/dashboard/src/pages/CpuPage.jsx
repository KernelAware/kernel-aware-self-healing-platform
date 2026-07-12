import React from 'react'
import { Activity, Download } from 'lucide-react'
import { PageHeader, ActionButton } from '@/components/kit'
import CpuUsageGauge from '@/components/cpu/CpuUsageGauge'
import LoadAverageGraph from '@/components/cpu/LoadAverageGraph'
import PerCoreBreakdown from '@/components/cpu/PerCoreBreakdown'
import CpuHistoryGraph from '@/components/cpu/CpuHistoryGraph'
import TopProcessesTable from '@/components/cpu/TopProcessesTable'

export default function CpuPage() {
  return (
    <>
      <PageHeader
        title="CPU Performance"
        description="Real-time kernel-level telemetry and resource allocation tracking."
        actions={
          <>
            <ActionButton icon={Download}>Export CSV</ActionButton>
            <ActionButton variant="primary" icon={Activity}>Diagnostic Run</ActionButton>
          </>
        }
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <CpuUsageGauge />
          <LoadAverageGraph />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PerCoreBreakdown />
          <CpuHistoryGraph />
        </div>

        <TopProcessesTable />
      </div>
    </>
  )
}
