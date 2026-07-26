import React from 'react'
import { HardDrive } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/kit'

export default function DiskIOGraph() {
  return (
    <Panel className="lg:col-span-2">
      <PanelHeader
        title="Storage Telemetry: Real-time I/O"
        icon={HardDrive}
      />
      <div className="p-2">
        <div className="overflow-hidden rounded-lg border border-border/60 bg-background shadow-sm">
          <iframe
            iframe src="http://localhost:3000/d-solo/ad6wn7h/new-dashboard?orgId=1&from=now-30m&to=now&timezone=browser&refresh=5s&panelId=panel-1" width="450" height="200" frameborder="0"
            className="w-full max-w-full"
            title="Disk I/O dashboard panel"
          />
        </div>
      </div>
    </Panel>
  )
}
