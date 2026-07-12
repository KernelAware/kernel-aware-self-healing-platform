import React from 'react'
import { Database, FolderOpen, Users, FileText } from 'lucide-react'
import { Panel, PanelHeader, StatusBadge, ProgressBar } from '@/components/kit'

const mounts = [
  { icon: FolderOpen, point: '/root', total: '500.0 GB', used: '112.5 GB', avail: '387.5 GB', pct: 22, tone: 'success', action: 'Analyze' },
  { icon: Users, point: '/home', total: '2.0 TB', used: '1.6 TB', avail: '400.0 GB', pct: 80, tone: 'warning', action: 'Optimize' },
  { icon: FileText, point: '/var/log', total: '100.0 GB', used: '8.4 GB', avail: '91.6 GB', pct: 8, tone: 'success', action: 'Rotation' },
  { icon: Database, point: '/mnt/data_store', total: '10.0 TB', used: '9.5 TB', avail: '0.5 TB', pct: 95, tone: 'danger', action: 'Critical: Expand' },
]

export default function DiskUsageTable() {
  return (
    <Panel className="mt-4">
      <PanelHeader title="File System Mounts & Partitions" icon={Database} action={<StatusBadge tone="success">Storage Health: Optimal</StatusBadge>} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-y border-border font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">Mount Point</th>
              <th className="px-4 py-2.5 text-left font-medium">Total Size</th>
              <th className="px-4 py-2.5 text-left font-medium">Used</th>
              <th className="px-4 py-2.5 text-left font-medium">Available</th>
              <th className="px-4 py-2.5 text-left font-medium">Usage %</th>
              <th className="px-4 py-2.5 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {mounts.map((m) => {
              const Icon = m.icon
              return (
                <tr key={m.point} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 text-primary">
                      <Icon className="size-4" />{m.point}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{m.total}</td>
                  <td className="px-4 py-3 text-foreground">{m.used}</td>
                  <td className="px-4 py-3 text-foreground">{m.avail}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={m.pct} tone={m.tone} className="w-24" />
                      <span className={m.tone === 'danger' ? 'text-destructive' : m.tone === 'warning' ? 'text-warning' : 'text-foreground'}>{m.pct}%</span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-right ${m.tone === 'danger' ? 'text-destructive' : 'text-accent'} hover:underline`}>
                    <button className="cursor-pointer">{m.action}</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
