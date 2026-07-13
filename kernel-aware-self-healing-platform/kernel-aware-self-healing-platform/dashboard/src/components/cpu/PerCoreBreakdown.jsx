import React from 'react'
import { Activity } from 'lucide-react'
import { Panel, PanelHeader, ProgressBar } from '@/components/kit'

const cores = [33, 36, 60, 42, 35, 10, 17, 68, 19, 37, 21, 37, 14, 43, 51, 48]

function coreTone(v) {
  if (v >= 60) return 'info'
  return 'success'
}

export default function PerCoreBreakdown() {
  return (
    <Panel>
      <PanelHeader title="Core Utilization (16 Cores)" icon={Activity} />
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-4 pt-0 sm:grid-cols-4">
        {cores.map((v, i) => (
          <div key={i}>
            <div className="mb-1 flex items-center justify-between font-mono text-[11px]">
              <span className="text-muted-foreground">#{String(i).padStart(2, '0')}</span>
              <span className="text-foreground">{v}%</span>
            </div>
            <ProgressBar value={v} tone={coreTone(v)} />
          </div>
        ))}
      </div>
    </Panel>
  )
}
