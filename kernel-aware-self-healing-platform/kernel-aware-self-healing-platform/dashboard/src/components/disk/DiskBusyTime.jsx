import React from 'react'
import { HardDrive } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/kit'

export default function DiskBusyTime() {
  return (
    <Panel className="lg:col-span-2">
      <PanelHeader
        title="Disk Busy Time"
        icon={HardDrive}
      />
      <div className="p-2">
        <div className="overflow-hidden rounded-lg border border-border/60 bg-background shadow-sm">
          <iframe
            src="http://localhost:3000/d-solo/adqmnxx/disk-metrics?orgId=1&from=now-30m&to=now&timezone=browser&refresh=5s&panelId=panel-2"
            width="450"
            height="200"
            frameBorder="0"
            className="w-full max-w-full"
            title="Disk Busy Time"
          />
        </div>
      </div>
    </Panel>
  )
}
