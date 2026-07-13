import React from 'react'
import { HardDrive } from 'lucide-react'
import { Panel, PanelHeader, Dot } from '@/components/kit'
import { TelemetryArea } from '@/components/TelemetryChart'

const mem = Array.from({ length: 13 }, (_, i) => ({
  x: `14:0${i < 10 ? '0' : ''}${i}`,
}))

const ioData = mem.map((m, i) => ({
  x: m.x,
  read: 200 + Math.round(Math.random() * 90),
  write: 150 + Math.round(Math.random() * 60)
}))

export default function DiskIOGraph() {
  return (
    <Panel className="lg:col-span-2">
      <PanelHeader
        title="Storage Telemetry: Real-time I/O"
        icon={HardDrive}
        action={
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1"><Dot tone="info" />Read (245 MB/s)</span>
            <span className="flex items-center gap-1"><Dot tone="success" />Write (182 MB/s)</span>
          </div>
        }
      />
      <div className="p-2">
        <TelemetryArea
          data={ioData}
          series={[
            { key: 'read', color: 'accent' },
            { key: 'write', color: 'primary' },
          ]}
          height={160}
        />
      </div>
    </Panel>
  )
}
