import React from 'react'
import { MemoryStick } from 'lucide-react'
import { Panel, PanelHeader, StatusBadge } from '@/components/kit'
import { TelemetryArea } from '@/components/TelemetryChart'

const mem = Array.from({ length: 13 }, (_, i) => ({
  x: `14:0${i < 10 ? '0' : ''}${i}`,
  used: 60 + Math.round(Math.sin(i / 2) * 6 + Math.random() * 4),
}))

export default function MemoryHistoryGraph() {
  return (
    <Panel className="lg:col-span-2">
      <PanelHeader title="Memory Temporal Analysis" icon={MemoryStick} action={<StatusBadge tone="info">Live Data</StatusBadge>} />
      <div className="p-2">
        <TelemetryArea data={mem} series={[{ key: 'used', color: 'primary' }]} height={300} />
      </div>
    </Panel>
  )
}
