import React from 'react'
import { HardDrive } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/kit'

export default function DiskIOPS() {
  return (
    <Panel className="mt-4">
      <PanelHeader
        title="Disk Read/Write IOPS"
        icon={HardDrive}
      />

      <div className="p-2 space-y-4">

        {/* Read / Write IOPS */}
        <div className="overflow-hidden rounded-lg border border-border/60 bg-background shadow-sm">
          <iframe
            src="http://localhost:3000/d-solo/adqmnxx/disk-metrics?orgId=1&from=now-30m&to=now&timezone=browser&refresh=5s&panelId=panel-6"
            width="450"
            height="400"
            frameBorder="0"
            className="w-full max-w-full"
            title="Disk Read/Write IOPS"
          />
        </div>

        {/* Bottom Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Total IOPS */}
          <div className="overflow-hidden rounded-lg border border-border/60 bg-background shadow-sm">
            <iframe
              src="http://localhost:3000/d-solo/adqmnxx/disk-metrics?orgId=1&from=now-30m&to=now&timezone=browser&refresh=5s&panelId=panel-7"
              width="450"
              height="220"
              frameBorder="0"
              className="w-full max-w-full"
              title="Disk Total IOPS"
            />
          </div>

          {/* Per Disk Total IOPS */}
          <div className="overflow-hidden rounded-lg border border-border/60 bg-background shadow-sm">
            <iframe
              src="http://localhost:3000/d-solo/adqmnxx/disk-metrics?orgId=1&from=now-30m&to=now&timezone=browser&refresh=5s&panelId=panel-14"
              width="450"
              height="220"
              frameBorder="0"
              className="w-full max-w-full"
              title="Per Disk Total IOPS"
            />
          </div>

        </div>

      </div>
    </Panel>
  )
}