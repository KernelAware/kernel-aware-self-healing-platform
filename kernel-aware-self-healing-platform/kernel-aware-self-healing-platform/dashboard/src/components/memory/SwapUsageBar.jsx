import React from 'react'
import { RefreshCw } from 'lucide-react'
import { Panel, ProgressBar } from '@/components/kit'

export default function SwapUsageBar() {
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Swap Usage</p>
        <RefreshCw className="size-4 text-warning" />
      </div>
      <p className="mt-3 font-mono text-2xl text-foreground">
        12.4 GB <span className="text-muted-foreground">/ 32.0 GB</span>
      </p>
      <ProgressBar value={39} tone="warning" className="mt-3" />
      <p className="mt-3 text-xs text-muted-foreground text-pretty">
        Swap pressure is within nominal thresholds for the current workload profile.
      </p>
    </Panel>
  )
}
