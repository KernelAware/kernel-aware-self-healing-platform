import React from 'react'
import { RotateCw, CircleX, Trash2, HardDrive, Scaling, Ban } from 'lucide-react'
import { Panel, PanelHeader, ActionButton } from '@/components/kit'

const catalog = [
  { icon: RotateCw, label: 'Restart Service', tier: 'L1' },
  { icon: CircleX, label: 'Kill Process', tier: 'L1' },
  { icon: Trash2, label: 'Clear Cache/Logs', tier: 'L2' },
  { icon: HardDrive, label: 'Free Disk Space', tier: 'L2' },
  { icon: Scaling, label: 'Scale Resources', tier: 'L3' },
  { icon: Ban, label: 'Isolate Node', tier: 'L4' },
]

export default function SupportedActionsList() {
  return (
    <Panel>
      <PanelHeader title="Action Catalog" icon={RotateCw} />
      <div className="flex flex-col gap-2 p-4 pt-0">
        {catalog.map((c) => {
          const Icon = c.icon
          return (
            <button 
              key={c.label} 
              className="flex items-center gap-3 rounded-md border border-border bg-secondary/30 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-secondary cursor-pointer"
            >
              <Icon className="size-4 text-primary" />
              <span className="text-sm text-foreground">{c.label}</span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">{c.tier}</span>
            </button>
          )
        })}
        <ActionButton className="mt-1 w-full justify-center cursor-pointer">Configure Policies</ActionButton>
      </div>
    </Panel>
  )
}
