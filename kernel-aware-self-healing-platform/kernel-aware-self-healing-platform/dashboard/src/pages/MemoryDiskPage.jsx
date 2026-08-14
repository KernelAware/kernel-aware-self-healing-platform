import React from 'react'
import { RefreshCw, Download } from 'lucide-react'
import { PageHeader, ActionButton } from '@/components/kit'
import MemoryUsageBar from '@/components/memory/MemoryUsageBar'
import SwapUsageBar from '@/components/memory/SwapUsageBar'
import MemoryHistoryGraph from '@/components/memory/MemoryHistoryGraph'
import DiskUsageTable from '@/components/disk/DiskUsageTable'
import DiskIOGraph from '@/components/disk/DiskIOGraph'
import DiskBusyTime from '@/components/disk/DiskBusyTime'
import DiskReadWriteSize from '@/components/disk/DiskReadWriteSize'
import DiskReadWriteCount from '@/components/disk/DiskReadWriteCount'
import DiskReadWriteIOPS from '@/components/disk/DiskReadWriteIOPS'
import DiskReadWriteLatency from '@/components/disk/DiskReadWriteLatency'
import DiskReadWriteSpeed from '@/components/disk/DiskReadWriteSpead'
import DiskReadWriteTime from '@/components/disk/DiskReadWriteTime'

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
        </div>

        <div className="mt-8">
          <PageHeader className="whitespace-nowrap"
            title="Disk Viewer"
            description="Unified kernel, service, and container streaming with Prometheus and Grafana. View disk I/O, read/write speed, latency, and more."
          />
        </div>
        

        <div className="grid grid-cols-1 gap-4">
          <DiskIOGraph />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <DiskUsageTable />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <DiskBusyTime />
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <DiskReadWriteSize />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <DiskReadWriteCount />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <DiskReadWriteIOPS />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <DiskReadWriteLatency />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <DiskReadWriteSpeed />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <DiskReadWriteTime />
        </div>

      </div>
    </>
  )
}
