import React from 'react'
import { Fan } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/kit'

const fans = [
  ['Intake Front 01', '1240 RPM'],
  ['Intake Front 02', '1235 RPM'],
  ['Exhaust Rear', '980 RPM'],
  ['CPU Liquid Pump', '2400 RPM'],
]

export default function FanSpeedMonitor() {
  return (
    <Panel>
      <PanelHeader title="Chassis Cooling" icon={Fan} />
      <ul className="divide-y divide-border px-4">
        {fans.map(([k, v]) => (
          <li key={k} className="flex items-center justify-between py-3 font-mono text-xs">
            <span className="text-muted-foreground">{k}</span>
            <span className="text-primary">{v}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
