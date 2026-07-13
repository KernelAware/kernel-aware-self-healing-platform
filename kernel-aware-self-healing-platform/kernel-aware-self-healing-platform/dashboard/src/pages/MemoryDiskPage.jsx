import React from 'react'
import { RefreshCw, Download } from 'lucide-react'
import { PageHeader, ActionButton } from '@/components/kit'
import MemoryUsageBar from '@/components/memory/MemoryUsageBar'
import SwapUsageBar from '@/components/memory/SwapUsageBar'
import MemoryHistoryGraph from '@/components/memory/MemoryHistoryGraph'
import DiskUsageTable from '@/components/disk/DiskUsageTable'
import DiskIOGraph from '@/components/disk/DiskIOGraph'

export default function MemoryDiskPage() {
  return (
    <>
      <PageHeader
        eyebrow="Node: kernel-prod-01"
        title="Resource Utilization & Storage"
        description="Live memory core, swap pressure and filesystem partition telemetry."
        actions={
          <>
            <ActionButton variant="primary" icon={RefreshCw}>Purge Cache</ActionButton>
            <ActionButton icon={Download}>Snapshot</ActionButton>
          </>
        }
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <MemoryUsageBar />
          <MemoryHistoryGraph />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SwapUsageBar />
          <DiskIOGraph />
        </div>

        <DiskUsageTable />
      </div>
    </>
  )
}
