import React from 'react'
import { Clock, Gauge, CircleCheck, Waypoints, Cpu } from 'lucide-react'
import { Panel, PanelHeader, ActionButton } from '@/components/kit'

const perfIndex = [
  { icon: Clock, label: 'System Uptime', value: '142d 04h 12m' },
  { icon: Gauge, label: 'Average CPU', value: '18.4%' },
  { icon: CircleCheck, label: 'Incidents Today', value: '04 Resolved' },
  { icon: Waypoints, label: 'Active Agents', value: '1,240 Nodes' },
]

const fleet = [
  { region: 'US-EAST', nodes: 512, pct: 41 },
  { region: 'EU-WEST', nodes: 418, pct: 34 },
  { region: 'ASIA-PACIFIC', nodes: 310, pct: 25 },
]

export function PerformanceIndex() {
  return (
    <Panel>
      <PanelHeader title="Performance Index" icon={Cpu} />
      <ul className="divide-y divide-border px-4">
        {perfIndex.map((row) => {
          const Icon = row.icon
          return (
            <li key={row.label} className="flex items-center gap-3 py-3">
              <span className="flex size-8 items-center justify-center rounded-md bg-secondary text-primary">
                <Icon className="size-4" />
              </span>
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className="ml-auto font-mono text-sm text-foreground">{row.value}</span>
            </li>
          )
        })}
      </ul>
      <div className="p-4 pt-2">
        <ActionButton variant="default" className="w-full justify-center bg-accent/15 text-accent hover:bg-accent/25">
          Export Compliance Report
        </ActionButton>
      </div>
    </Panel>
  )
}

export function GlobalFleet() {
  return (
    <Panel>
      <PanelHeader title="Global Fleet Distribution" icon={Waypoints} />
      <div className="flex flex-col gap-4 p-4 pt-0">
        {fleet.map((r) => (
          <div key={r.region}>
            <div className="mb-1 flex items-center justify-between font-mono text-xs">
              <span className="text-foreground/80">{r.region}</span>
              <span className="text-muted-foreground">{r.nodes} nodes</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
            </div>
          </div>
        ))}
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          1,240 active agents · USA / EU / ASIA PACIFIC
        </p>
      </div>
    </Panel>
  )
}

export default function QuickStats() {
  return (
    <div className="flex flex-col gap-4">
      <PerformanceIndex />
      <GlobalFleet />
    </div>
  )
}
