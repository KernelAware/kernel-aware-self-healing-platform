import React, { useState } from 'react'
import { Gauge, Skull, Search } from 'lucide-react'
import { Panel, PanelHeader, ActionButton } from '@/components/kit'
import { api } from '@/services/api'

const INITIAL_PROCS = [
  { name: 'python3', pid: 12452, user: 'k-sentinel-svc', cpu: '12.5%', mem: '1.2%', path: '/usr/bin/python3 /opt/sentinel/agent.py', hot: true },
  { name: 'prometheus', pid: 881, user: 'prometheus', cpu: '2.1%', mem: '18.4%', path: '/usr/local/bin/prometheus --config.file=', hot: false },
  { name: 'dockerd', pid: 142, user: 'root', cpu: '0.8%', mem: '4.2%', path: '/usr/bin/dockerd -H fd:// --containerd=', hot: false },
  { name: 'systemd-journal', pid: 54, user: 'root', cpu: '0.2%', mem: '0.1%', path: '/lib/systemd/systemd-journald', hot: false },
  { name: 'nginx: master', pid: 22481, user: 'www-data', cpu: '0.1%', mem: '0.2%', path: 'nginx: master process /usr/sbin/nginx -g', hot: false },
]

export default function ProcessesTable() {
  const [procs, setProcs] = useState(INITIAL_PROCS)
  const [search, setSearch] = useState('')

  const killZombie = async (pid) => {
    const res = await api.killProcess(pid)
    if (res.success) {
      setProcs((prev) => prev.filter((p) => p.pid !== pid))
    }
  }

  const killAllZombies = () => {
    setProcs((prev) => prev.filter((p) => !p.hot))
  }

  const filtered = procs.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    String(p.pid).includes(search) ||
    p.user.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Panel className="mt-4">
      <PanelHeader
        title="Active Process Explorer"
        icon={Gauge}
        action={
          <ActionButton 
            variant="default" 
            onClick={killAllZombies}
            className="bg-destructive/15 text-destructive hover:bg-destructive/25 cursor-pointer" 
            icon={Skull}
          >
            Kill All Zombies
          </ActionButton>
        }
      />
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search PID, Process Name, or User..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-y border-border font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">Name</th>
              <th className="px-4 py-2.5 text-left font-medium">PID</th>
              <th className="px-4 py-2.5 text-left font-medium">User</th>
              <th className="px-4 py-2.5 text-left font-medium">%CPU</th>
              <th className="px-4 py-2.5 text-left font-medium">%Mem</th>
              <th className="px-4 py-2.5 text-left font-medium">Command Path</th>
              <th className="px-4 py-2.5 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {filtered.map((p) => (
              <tr key={p.pid} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                <td className="px-4 py-3 font-semibold text-foreground">{p.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.pid}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.user}</td>
                <td className={`px-4 py-3 ${p.hot ? 'text-destructive font-bold' : 'text-primary'}`}>{p.cpu}</td>
                <td className={`px-4 py-3 ${parseFloat(p.mem) > 10 ? 'text-warning' : 'text-foreground'}`}>{p.mem}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.path}</td>
                <td className="px-4 py-3 text-right">
                  <button 
                    onClick={() => killZombie(p.pid)}
                    className="text-destructive hover:underline cursor-pointer font-mono"
                  >
                    Kill
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 font-mono text-[11px] text-muted-foreground">
        <span>Showing 1–{filtered.length} of {procs.length} processes</span>
        <div className="flex items-center gap-1">
          <button className="flex size-7 items-center justify-center rounded border border-border hover:bg-secondary cursor-pointer">1</button>
          <button className="flex size-7 items-center justify-center rounded border border-border hover:bg-secondary cursor-pointer">2</button>
        </div>
      </div>
    </Panel>
  )
}
