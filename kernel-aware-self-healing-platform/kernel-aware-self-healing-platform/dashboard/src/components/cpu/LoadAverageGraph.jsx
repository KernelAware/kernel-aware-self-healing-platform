import React from 'react'
import { Sparkles } from 'lucide-react'
import { Panel } from '@/components/kit'

export default function LoadAverageGraph() {
  return (
    <Panel className="flex flex-col items-center justify-center gap-3 p-6 lg:col-span-2" style={{ height: '400px' }}>
      <div className="flex size-16 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary shadow-glow-primary">
        <Sparkles className="size-7" />
      </div>
      <h3 className="text-lg font-semibold">Predictive Analysis</h3>
      <p className="max-w-md text-center text-sm text-muted-foreground text-pretty">
        No thermal throttling detected. Kernel stability index:{' '}
        <span className="text-primary">0.998</span>. The autonomous agent forecasts nominal load
        over the next 30 minutes with no remediation required.
      </p>
    </Panel>
  )
}
