import React from 'react'
import { Gauge } from 'lucide-react'
import { Panel, PanelHeader, StatusBadge, CircularGauge } from '@/components/kit'
import { useMetrics } from '@/hooks/useMetrics'

export default function MetricGauges() {
  const metrics = useMetrics()

  return (
    <Panel className="lg:col-span-2">
      <PanelHeader title="Real-time Resource Gauges" icon={Gauge} action={<StatusBadge tone="success">Live</StatusBadge>} />
      <div className="grid grid-cols-1 gap-4 p-4 pt-0 sm:grid-cols-3">
        <GaugeBlock value={metrics.cpu} label="CPU Load" tone="info" a={['MIN', '12%']} b={['MAX', '88%']} />
        <GaugeBlock value={metrics.memory} label="Memory" tone="success" a={['TOTAL', '128GB']} b={['USED', '87GB']} />
        <GaugeBlock value={45} label="Disk I/O" tone="info" a={['READ', '1.2GB/s']} b={['WRITE', '450MB/s']} />
      </div>
    </Panel>
  )
}

function GaugeBlock({ value, label, tone, a, b }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg bg-secondary/30 p-4">
      <CircularGauge value={value} label={label} tone={tone} size={140} />
      <div className="grid w-full grid-cols-2 gap-2 text-center">
        {[a, b].map(([k, v]) => (
          <div key={k}>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
            <p className="font-mono text-sm text-foreground">{v}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
