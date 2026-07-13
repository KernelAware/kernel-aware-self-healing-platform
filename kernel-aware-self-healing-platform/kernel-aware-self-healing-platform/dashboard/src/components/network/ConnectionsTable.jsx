import React from 'react'
import { Waypoints } from 'lucide-react'
import { Panel, PanelHeader, Dot } from '@/components/kit'

const sockets = [
  { port: '443/TCP', ip: '172.217.16.174', state: 'Established', tone: 'success', proc: 'nginx_worker', rate: '4.2MB/s' },
  { port: '80/TCP', ip: '52.202.114.8', state: 'Established', tone: 'success', proc: 'prometheus', rate: '1.1MB/s' },
  { port: '53/UDP', ip: '8.8.8.8', state: 'Listen', tone: 'muted', proc: 'systemd-resolve', rate: '12KB/s' },
  { port: '9092/TCP', ip: '10.0.4.88', state: 'Established', tone: 'success', proc: 'kafka_broker', rate: '28.5MB/s' },
  { port: '6379/TCP', ip: '10.0.4.12', state: 'Established', tone: 'success', proc: 'redis-server', rate: '3.4MB/s' },
]

export default function ConnectionsTable() {
  return (
    <Panel className="lg:col-span-2">
      <PanelHeader title="Socket Manifest" icon={Waypoints} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-y border-border font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">Port / Proto</th>
              <th className="px-4 py-2.5 text-left font-medium">Remote IP</th>
              <th className="px-4 py-2.5 text-left font-medium">State</th>
              <th className="px-4 py-2.5 text-left font-medium">Process</th>
              <th className="px-4 py-2.5 text-right font-medium">Rate</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {sockets.map((s) => (
              <tr key={s.port} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                <td className="px-4 py-3 text-primary">{s.port}</td>
                <td className="px-4 py-3 text-foreground">{s.ip}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-foreground/80"><Dot tone={s.tone} />{s.state}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.proc}</td>
                <td className="px-4 py-3 text-right text-primary">{s.rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
