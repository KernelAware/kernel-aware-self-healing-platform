import { useState } from 'react'

const INITIAL_INCIDENTS = [
  { id: 'IX-9942', title: 'Kernel Thread Staleness in Cluster-A', prio: 'P0', status: 'Resolved', start: 'Oct 24, 14:01:22', res: '3m 12s' },
  { id: 'IX-9938', title: 'Redis Latency Spike > 500ms', prio: 'P1', status: 'Resolved', start: 'Oct 24, 11:45:10', res: '1m 45s' },
  { id: 'IX-9935', title: 'Postgres Max Connections Reached', prio: 'P0', status: 'Resolved', start: 'Oct 24, 09:12:00', res: '12m 04s' },
  { id: 'IX-9930', title: 'SSL Certificate Expiry Warning', prio: 'P3', status: 'Awaiting', start: 'Oct 23, 23:59:59', res: '--' },
]

const INITIAL_TIMELINE = [
  { time: '14:01:22.043', tone: 'info', label: 'Syscall Entry', title: 'mmap(NULL, 134217728, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0)', note: "Process 'node' requested hugepage allocation beyond available VM limits." },
  { time: '14:01:23.901', tone: 'danger', label: 'OOM Killer Triggered', title: 'Kernel invoked oom_kill_process().', note: 'Target PID: 8842 (ReplicaSet 0). Total RAM exhausted: 98.4%.' },
  { time: '14:01:25.112', tone: 'success', label: 'Self-Healing Initiated', title: 'Action: Container Scale-Up', note: 'Spinning up additional replica in AZ-2 to offload traffic from degraded node.' },
]

export function useIncidents() {
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS)
  const [timeline, setTimeline] = useState(INITIAL_TIMELINE)

  return {
    incidents,
    timeline,
    setIncidents,
    setTimeline,
  }
}
