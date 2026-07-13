import React from 'react'
import { Activity } from 'lucide-react'
import { Panel, PanelHeader, Dot } from '@/components/kit'
import { TelemetryArea } from '@/components/TelemetryChart'

const perf = Array.from({ length: 13 }, (_, i) => ({
  x: `${i * 5}m`,
  user: 30 + Math.round(Math.sin(i / 2) * 12 + Math.random() * 8),
  system: 15 + Math.round(Math.cos(i / 3) * 6 + Math.random() * 5),
  iowait: 4 + Math.round(Math.random() * 4),
}))

export default function CpuHistoryGraph() {
  return (
    <Panel>
      <PanelHeader
        title="Performance Overview (60 mins)"
        icon={Activity}
        action={
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1"><Dot tone="success" />User</span>
            <span className="flex items-center gap-1"><Dot tone="info" />System</span>
            <span className="flex items-center gap-1"><Dot tone="danger" />IOWait</span>
          </div>
        }
      />
      <div className="p-2">
        <TelemetryArea
          data={perf}
          series={[
            { key: 'user', color: 'primary' },
            { key: 'system', color: 'accent' },
            { key: 'iowait', color: 'destructive' },
          ]}
        />
      </div>
    </Panel>
  )
}
