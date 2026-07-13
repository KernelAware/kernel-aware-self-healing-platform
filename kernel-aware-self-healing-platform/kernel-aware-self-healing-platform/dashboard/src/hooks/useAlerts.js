import { useState } from 'react'

const INITIAL_ALERTS = [
  { id: 1, level: 'P0 - Critical', tone: 'danger', age: '2m ago', title: 'eBPF Kernel Panic Imminent: kworker_0', body: 'Illegal memory access detected at 0xFFFFF800. Stack trace suggests corruption in the file descriptor table.', acked: false },
  { id: 2, level: 'P1 - High Warning', tone: 'warning', age: '15m ago', title: 'Memory Leak: Apache Flink', body: 'Resident set size (RSS) growing > 50MB/min. Heap exhaustion expected in 18 minutes.', acked: false },
  { id: 3, level: 'P3 - Low', tone: 'muted', age: '1h ago', title: 'Unusual Log Volume: Nginx', body: '404 spike detected in region us-east-1a. Self-healing engine investigating.', acked: true },
]

export function useAlerts() {
  const [alerts, setAlerts] = useState(INITIAL_ALERTS)

  const acknowledgeAlert = (id) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acked: true } : a))
    )
  }

  const resolveAlert = (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  return {
    alerts,
    acknowledgeAlert,
    resolveAlert,
    criticalCount: alerts.filter((a) => a.tone === 'danger').length,
  }
}
