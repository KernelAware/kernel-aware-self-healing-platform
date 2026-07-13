import React, { useState } from 'react'
import { PageHeader, Panel } from '@/components/kit'
import LogFilter from '@/components/logs/LogFilter'
import LogLevelChart from '@/components/logs/LogLevelChart'
import LogStream from '@/components/logs/LogStream'

const LOGS = [
  { time: '14:02:10.432', sev: 'INFO', tag: 'kernel', msg: 'eBPF probe attached to syscall:__x64_sys_execve successfully.' },
  { time: '14:02:11.112', sev: 'INFO', tag: 'sentinel-daemon', msg: 'Refreshing autonomous policies from core engine.' },
  { time: '14:02:11.890', sev: 'WARN', tag: 'memory', msg: 'Swappiness threshold exceeded on Node_04 (Current: 92%).' },
  { time: '14:02:12.001', sev: 'INFO', tag: 'self-healing', msg: 'Initiating cache purge on worker_svc_7.' },
  { time: '14:02:12.445', sev: 'ERROR', tag: 'docker', msg: 'Runtime mismatch detected in container context [uuid: a8f921].' },
  { time: '14:02:13.112', sev: 'INFO', tag: 'audit', msg: "User 'admin' accessed log viewer module." },
  { time: '14:02:13.567', sev: 'INFO', tag: 'kernel', msg: 'Memory page compaction complete (Duration: 142ms).' },
  { time: '14:02:14.221', sev: 'WARN', tag: 'network', msg: 'Retransmission rate spiked on eth0 (Current: 1.4%).' },
  { time: '14:02:15.002', sev: 'INFO', tag: 'sentinel-daemon', msg: 'Syncing state with Prometheus HA cluster.' },
  { time: '14:02:15.678', sev: 'ERROR', tag: 'postgres', msg: "Connection timeout from pool 'analytics_backend' after 5000ms." },
  { time: '14:02:16.110', sev: 'INFO', tag: 'self-healing', msg: 'PostgreSQL connection pool increased to 200.' },
  { time: '14:02:16.443', sev: 'INFO', tag: 'kernel', msg: 'Kprobes successfully deployed to audit file descriptors.' },
  { time: '14:02:17.001', sev: 'INFO', tag: 'audit', msg: 'Successfully authenticated session for client IP 192.168.1.10.' },
  { time: '14:02:18.537', sev: 'ERROR', tag: 'network', msg: 'Heartbeat lost from remote agent Node_05.' },
]

export default function LogsPage() {
  const [live, setLive] = useState(true)
  const [active, setActive] = useState(['INFO', 'WARN', 'ERROR'])
  const [sources, setSources] = useState(['Kernel eBPF', 'Systemd Service'])

  const toggleSev = (s) =>
    setActive((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))
  const toggleSrc = (s) =>
    setSources((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))
  const resetAll = () => {
    setActive(['INFO', 'WARN', 'ERROR', 'DEBUG'])
    setSources(['Kernel eBPF', 'Systemd Service', 'Container Runtime', 'Auth.log'])
  }

  const visible = LOGS.filter((l) => active.includes(l.sev))

  return (
    <>
      <PageHeader
        title="Logs Viewer"
        description="Unified kernel, service, and container log streaming with Loki-backed pattern recognition."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Events / Second', value: '842', note: '+12% vs avg', tone: 'text-primary' },
          { label: 'Critical Anomalies', value: '02', note: 'Last 4m ago', tone: 'text-destructive' },
          { label: 'Disk Usage (Logs)', value: '1.2 TB', note: 'Retention: 30d', tone: 'text-foreground' },
          { label: 'Latency (eBPF)', value: '14ms', note: 'Healthy', tone: 'text-primary' },
        ].map((s) => (
          <Panel key={s.label} className="p-4">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{s.label}</p>
            <p className={`mt-2 text-3xl font-bold ${s.tone}`}>{s.value}</p>
            <p className="font-mono text-xs text-muted-foreground">{s.note}</p>
          </Panel>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <Panel className="h-fit p-5">
          <LogFilter 
            active={active} 
            sources={sources} 
            toggleSev={toggleSev} 
            toggleSrc={toggleSrc} 
            resetAll={resetAll} 
          />
          <div className="mt-4 pt-4 border-t border-border">
            <LogLevelChart />
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <LogStream logs={visible} live={live} setLive={setLive} />
        </Panel>
      </div>
    </>
  )
}
