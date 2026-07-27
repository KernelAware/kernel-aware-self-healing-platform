import React from 'react'
import { Database } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/kit'

export default function DiskReadWriteSpeed() {
  return (
    <Panel className="mt-4">
      <PanelHeader title="Disk Read/Write Speed" icon={Database} />
      <div className="p-2">
        <div className="overflow-hidden rounded-lg border border-border/60 bg-background shadow-sm">
          <iframe
            src="http://localhost:3000/d-solo/adqmnxx/disk-metrics?orgId=1&from=now-30m&to=now&timezone=browser&refresh=5s&panelId=panel-9"
            width="450"
            height="400"
            frameBorder="0"
            className="w-full max-w-full"
            title="Disk Read/Write Speed"
          />
        </div>
      </div>
    </Panel>
  )
}