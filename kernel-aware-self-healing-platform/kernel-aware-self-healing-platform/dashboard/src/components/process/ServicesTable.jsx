import React, { useState } from 'react'
import { SquareTerminal, RotateCw, Power } from 'lucide-react'
import { Panel, PanelHeader, StatusBadge } from '@/components/kit'

const INITIAL_SERVICES = [
  { name: 'kernel-sentinel-core.service', desc: 'Autonomous monitoring engine', status: 'Active', tone: 'success', uptime: '14d 22h 12m', restarts: 0 },
  { name: 'ebpf-telemetry-collector.service', desc: 'Kernel-level trace collection', status: 'Active', tone: 'success', uptime: '4d 03h 45m', restarts: 2 },
  { name: 'network-bridge-manager.service', desc: 'SDN Layer 3 Routing Agent', status: 'Inactive', tone: 'danger', uptime: '--', restarts: 14 },
  { name: 'anomaly-detector-ai.service', desc: 'ML inference anomaly scoring', status: 'Active', tone: 'success', uptime: '9d 11h 02m', restarts: 1 },
]

export default function ServicesTable() {
  const [services, setServices] = useState(INITIAL_SERVICES)

  const toggleService = (name) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.name === name) {
          const isActive = s.status === 'Active'
          return {
            ...s,
            status: isActive ? 'Inactive' : 'Active',
            tone: isActive ? 'danger' : 'success',
            uptime: isActive ? '--' : '0s',
            restarts: isActive ? s.restarts : s.restarts + 1
          }
        }
        return s
      })
    )
  }

  const restartService = (name) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.name === name && s.status === 'Active') {
          return {
            ...s,
            restarts: s.restarts + 1,
            uptime: '0s'
          }
        }
        return s
      })
    )
  }

  return (
    <Panel className="lg:col-span-2">
      <PanelHeader
        title="Critical System Services"
        icon={SquareTerminal}
        action={
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider">
            <span className="text-primary">{services.filter(s => s.status === 'Active').length} Active</span>
            <span className="text-destructive">{services.filter(s => s.status === 'Inactive').length} Stopped</span>
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-y border-border font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">Service Name</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-left font-medium">Uptime</th>
              <th className="px-4 py-2.5 text-left font-medium">Restarts</th>
              <th className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {services.map((s) => (
              <tr key={s.name} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                <td className="px-4 py-3">
                  <p className="font-mono text-primary">{s.name}</p>
                  <p className="text-muted-foreground">{s.desc}</p>
                </td>
                <td className="px-4 py-3"><StatusBadge tone={s.tone}>{s.status}</StatusBadge></td>
                <td className="px-4 py-3 font-mono text-foreground/80">{s.uptime}</td>
                <td className="px-4 py-3 font-mono text-foreground/80">{s.restarts}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5 text-muted-foreground">
                    <button 
                      onClick={() => restartService(s.name)}
                      disabled={s.status !== 'Active'}
                      className="hover:text-primary disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="Restart Service"
                    >
                      <RotateCw className="size-4" />
                    </button>
                    <button 
                      onClick={() => toggleService(s.name)}
                      className="hover:text-destructive cursor-pointer"
                      title={s.status === 'Active' ? 'Stop Service' : 'Start Service'}
                    >
                      <Power className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
