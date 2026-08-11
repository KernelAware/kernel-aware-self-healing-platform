import React from 'react'
import { HardDrive } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/kit'

export default function DiskIOGraph() {
  return (
    <Panel className="mt-4">
      <PanelHeader
        title="Disk Usage"
        icon={HardDrive}
      />
      <div className="p-2 space-y-10">
         <div className="overflow-hidden rounded1-lg border border-border/60 bg-background shadow-sm">
          <iframe
            src="http://localhost:3000/d-solo/adqmnxx/disk-metrics?orgId=1&from=now-30m&to=now&timezone=browser&refresh=5s&panelId=panel-1"
            width="450"
            height="400"
            frameBorder="0"
            className="w-full max-w-full"
            title="Disk Usage"
          />
        </div>

        <div className="mt-2 overflow-hidden rounded-lg border border-border/60 bg-background shadow-sm">
          <iframe
            src="http://localhost:3000/d-solo/adqmnxx/disk-metrics?orgId=1&from=now-30m&to=now&timezone=browser&refresh=5s&panelId=panel-13" 
            width="450" 
            height="200" 
            frameborder="0"
            className="w-full max-w-full"
            title="Disk Usage Panel 2"
          />
        </div>
      </div>
    </Panel>
  )
}
