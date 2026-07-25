import React from 'react'
import { MemoryStick } from 'lucide-react'
import { Panel, PanelHeader, StatusBadge } from '@/components/kit'

export default function MemoryHistoryGraph() {
  return (
    <Panel className="lg:col-span-2">
      <PanelHeader
        title="Memory Temporal Analysis"
        icon={MemoryStick}
        action={<StatusBadge tone="info">Grafana Live</StatusBadge>}
      />

      <iframe
        src="http://localhost:3000/d-solo/adbgpks/available-memory?orgId=1&from=now-5m&to=now&refresh=5s&theme=dark&panelId=panel-4"
        width="100%"
        height="320"
        frameBorder="0"
      />
    </Panel>
  )
}