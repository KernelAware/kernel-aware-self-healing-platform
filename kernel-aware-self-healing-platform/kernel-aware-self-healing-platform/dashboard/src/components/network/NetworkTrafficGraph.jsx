import React from 'react'
import { Waypoints } from 'lucide-react'
import { Panel, PanelHeader, Dot } from '@/components/kit'
import { TelemetryLine } from '@/components/TelemetryChart'

const flow = Array.from({ length: 30 }, (_, i) => ({
  x: `${i * 2}s`,
  rx: 40 + Math.round(Math.sin(i / 3) * 30 + Math.random() * 15 + i),
  tx: 30 + Math.round(Math.cos(i / 4) * 20 + Math.random() * 12),
}))

export default function NetworkTrafficGraph() {
  return (
    <Panel className="mt-4">
      <PanelHeader
        title="Traffic Telemetry Flow · Last 60 Seconds"
        icon={Waypoints}
        action={
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1"><Dot tone="success" />RX Inbound</span>
            <span className="flex items-center gap-1"><Dot tone="info" />TX Outbound</span>
          </div>
        }
      />
      <div className="p-2">
        <TelemetryLine
          data={flow}
          series={[
            { key: 'rx', color: 'primary' },
            { key: 'tx', color: 'accent' },
          ]}
          height={280}
        />
      </div>
    </Panel>
  )
}
