import React from 'react'
import { Zap } from 'lucide-react'
import { Panel, ProgressBar } from '@/components/kit'
import { useMetrics } from '@/hooks/useMetrics'

export default function CpuUsageGauge() {
  const metrics = useMetrics()

  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Total CPU Utilization
        </p>
        <Zap className="size-4 text-primary" />
      </div>
      <div className="mt-4 flex items-end gap-3">
        <span className="text-6xl font-bold tracking-tight text-primary text-glow-primary">
          {typeof metrics.cpu === 'number' ? metrics.cpu.toFixed(1) : metrics.cpu}%
        </span>
        <span className="mb-2 font-mono text-xs text-primary">↑1.2% vs last hr</span>
      </div>
      <div className="mt-6 space-y-4">
        {[
          { k: 'Load Avg (1m)', v: '2.14', pct: 40, tone: 'success' },
          { k: 'Load Avg (5m)', v: '1.89', pct: 32, tone: 'info' },
          { k: 'Load Avg (15m)', v: '2.05', pct: 38, tone: 'neutral' },
        ].map((l) => (
          <div key={l.k}>
            <div className="mb-1 flex items-center justify-between font-mono text-xs">
              <span className="text-muted-foreground">{l.k}</span>
              <span className="text-foreground">{l.v}</span>
            </div>
            <ProgressBar value={l.pct} tone={l.tone} />
          </div>
        ))}
      </div>
    </Panel>
  )
}
