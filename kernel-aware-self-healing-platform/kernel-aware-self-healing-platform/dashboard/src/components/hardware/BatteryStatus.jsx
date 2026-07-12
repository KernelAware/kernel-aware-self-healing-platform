import React from 'react'
import { Zap } from 'lucide-react'
import { Panel, PanelHeader, ProgressBar } from '@/components/kit'

export default function BatteryStatus() {
  return (
    <Panel>
      <PanelHeader title="Power Unit (PSU)" icon={Zap} />
      <div className="p-4 pt-0">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-muted-foreground">Current Load</span>
          <span className="text-foreground">412W</span>
        </div>
        <ProgressBar value={52} tone="info" className="my-3" />
        <div className="grid grid-cols-2 gap-2">
          {[['Efficiency', '94.2%'], ['Input Volts', '230.1V']].map(([k, v]) => (
            <div key={k} className="rounded-md border border-border bg-secondary/30 p-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
              <p className="mt-1 font-mono text-sm text-primary">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}
