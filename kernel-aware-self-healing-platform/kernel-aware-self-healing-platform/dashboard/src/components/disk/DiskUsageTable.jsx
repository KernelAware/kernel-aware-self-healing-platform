import React from 'react'
import { Database, FolderOpen, Users, FileText } from 'lucide-react'
import { Panel, PanelHeader, StatusBadge, ProgressBar } from '@/components/kit'

const mounts = [
  { icon: FolderOpen, point: '/root', total: '500.0 GB', used: '112.5 GB', avail: '387.5 GB', pct: 22, tone: 'success', action: 'Analyze' },
  { icon: Users, point: '/home', total: '2.0 TB', used: '1.6 TB', avail: '400.0 GB', pct: 80, tone: 'warning', action: 'Optimize' },
  { icon: FileText, point: '/var/log', total: '100.0 GB', used: '8.4 GB', avail: '91.6 GB', pct: 8, tone: 'success', action: 'Rotation' },
  { icon: Database, point: '/mnt/data_store', total: '10.0 TB', used: '9.5 TB', avail: '0.5 TB', pct: 95, tone: 'danger', action: 'Critical: Expand' },
]

export default function DiskUsageTable() {
  return (
    <Panel className="mt-4">
      <PanelHeader title="File System Mounts & Partitions" icon={Database}/>
      <div className="p-2 space-y-10">
        <div className="overflow-hidden rounded-lg border border-border/60 bg-background shadow-sm">
          <iframe
            src="http://localhost:3000/d-solo/adqmnxx/disk-metrics?orgId=1&from=now-30m&to=now&timezone=browser&refresh=5s&panelId=panel-3" width="450" height="1040" frameborder="0"
            className="w-full max-w-full"
            title="Disk Metrics"
          />
        </div>


        <div className="mt-2 overflow-hidden rounded-lg border border-border/60 bg-background shadow-sm">
          <iframe
            src="http://localhost:3000/d-solo/adqmnxx/disk-metrics?orgId=1&from=now-30m&to=now&timezone=browser&refresh=5s&panelId=panel-11" width="450" height="700" frameborder="0"
            className="w-full max-w-full"
            title="Disk Metrics Panel 2"
          />
        </div>
      </div>
    </Panel>
  )
}
