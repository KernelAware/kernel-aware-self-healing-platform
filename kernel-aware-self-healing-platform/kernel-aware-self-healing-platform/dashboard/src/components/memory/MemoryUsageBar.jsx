import React from 'react'
import { MemoryStick } from 'lucide-react'
import { Panel, PanelHeader, CircularGauge } from '@/components/kit'
import { useMetrics } from '@/hooks/useMetrics'

export default function MemoryUsageBar() {
  const metrics = useMetrics()

  return (
    <Panel>
      <PanelHeader title="RAM Breakdown — Memory Core" icon={MemoryStick} />
      <div className="flex flex-col items-center gap-6 p-6 pt-2">
        <CircularGauge value={metrics.memory} label="Loaded" tone="success" size={200} />
        <div className="grid w-full grid-cols-3 gap-2 border-t border-border pt-4 text-center">
          {[
            ['Total', '128GB', 'text-foreground'],
            ['Used', `${Math.round(128 * (metrics.memory / 100))}GB`, 'text-primary'],
            ['Free', `${Math.round(128 * (1 - metrics.memory / 100))}GB`, 'text-foreground'],
          ].map(([k, v, c]) => (
            <div key={k}>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
              <p className={`font-mono text-sm ${c}`}>{v}</p>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}
