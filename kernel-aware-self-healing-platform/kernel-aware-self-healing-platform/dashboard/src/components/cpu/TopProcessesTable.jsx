import React from 'react'
import { ListFilter, RefreshCw } from 'lucide-react'
import { Panel, PanelHeader, Dot } from '@/components/kit'

const procs = [
  { name: 'kworker/u128:2', pid: 38491, cpu: '14.2%', mem: '0.1%', status: 'Running', tone: 'success', color: 'text-primary' },
  { name: 'prometheus', pid: 1204, cpu: '8.4%', mem: '4.2%', status: 'Running', tone: 'success', color: 'text-primary' },
  { name: 'docker-containerd', pid: 892, cpu: '5.1%', mem: '1.8%', status: 'Sleeping', tone: 'muted', color: 'text-foreground' },
  { name: 'python3 (ml_inference)', pid: 42931, cpu: '4.8%', mem: '12.4%', status: 'Running', tone: 'success', color: 'text-destructive' },
  { name: 'systemd-journald', pid: 451, cpu: '2.1%', mem: '0.4%', status: 'Running', tone: 'success', color: 'text-foreground' },
]

export default function TopProcessesTable() {
  return (
    <Panel className="mt-4">
      <PanelHeader
        title="Top CPU Consuming Processes"
        icon={ListFilter}
        action={
          <div className="flex items-center gap-1">
            <button className="flex size-7 items-center justify-center rounded text-muted-foreground hover:text-foreground cursor-pointer"><ListFilter className="size-4" /></button>
            <button className="flex size-7 items-center justify-center rounded text-muted-foreground hover:text-foreground cursor-pointer"><RefreshCw className="size-4" /></button>
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-y border-border font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">Name</th>
              <th className="px-4 py-2.5 text-left font-medium">PID</th>
              <th className="px-4 py-2.5 text-left font-medium">% CPU</th>
              <th className="px-4 py-2.5 text-left font-medium">% Mem</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {procs.map((p) => (
              <tr key={p.pid} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                <td className={`px-4 py-3 ${p.color}`}>{p.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.pid}</td>
                <td className={`px-4 py-3 ${p.name.includes('python') ? 'text-destructive' : 'text-foreground'}`}>{p.cpu}</td>
                <td className="px-4 py-3 text-foreground">{p.mem}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-foreground/80">
                    <Dot tone={p.tone} />{p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-accent hover:underline">
                  <button className="cursor-pointer">Profile</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
