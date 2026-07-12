import React from 'react'
import { HardDrive } from 'lucide-react'
import { Panel, PanelHeader, StatusBadge, ProgressBar, ActionButton } from '@/components/kit'

const smart = [
  { name: 'NVMe0 (System)', status: 'Healthy', tone: 'success', detail: 'Life Remaining: 98.4%', temp: '32°C', pct: 98 },
  { name: 'SDA1 (Data Archive)', status: 'Warning', tone: 'warning', detail: 'Reallocated Sectors: 14', temp: '44°C', pct: 62 },
  { name: 'SDB1 (Hot Backup)', status: 'Healthy', tone: 'success', detail: 'Predicted Failure: 0%', temp: '28°C', pct: 100 },
]

export default function SmartDiskStatus() {
  return (
    <Panel>
      <PanelHeader title="S.M.A.R.T. Health" icon={HardDrive} />
      <div className="flex flex-col gap-3 p-4 pt-0">
        {smart.map((d) => (
          <div key={d.name} className="rounded-md border border-border bg-secondary/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{d.name}</span>
              <StatusBadge tone={d.tone}>{d.status}</StatusBadge>
            </div>
            <ProgressBar value={d.pct} tone={d.tone === 'warning' ? 'warning' : 'success'} className="my-2" />
            <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
              <span>{d.detail}</span>
              <span>Temp: {d.temp}</span>
            </div>
          </div>
        ))}
        <ActionButton className="w-full justify-center cursor-pointer">Run Full SMART Diagnostic</ActionButton>
      </div>
    </Panel>
  )
}
