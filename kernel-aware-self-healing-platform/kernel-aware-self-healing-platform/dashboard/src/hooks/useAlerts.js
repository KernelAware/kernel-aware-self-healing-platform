import {useEffect, useState} from 'react'
import {useWebSocket} from "@/hooks/useWebSocket.js";

const INITIAL_ALERTS = [
  {
    id: "INC-1042",
    level: "P0 - Critical",
    tone: "danger",
    age: "2m ago",
    title: "High CPU Usage - nginx",
    body: "CPU usage reached 96.4%, above the 90% threshold for 5 minutes.",
    acked: false,
    status: "WAITING_APPROVAL",
    system: "server-01",
    process: "nginx",
    pid: 8842
  },

  {
    id: "INC-1043",
    level: "P1 - High",
    tone: "warning",
    age: "6m ago",
    title: "Memory Usage High - python",
    body: "Memory usage reached 87.2%, above the 80% threshold for 5 minutes.",
    acked: false,
    status: "HEALING",
    system: "server-01",
    process: "python-app",
    pid: 9231
  },

  {
    id: "INC-1044",
    level: "P2 - Medium",
    tone: "muted",
    age: "15m ago",
    title: "Disk Space Low - /var",
    body: "Disk usage reached 92.8%, above the 80% threshold for 10 minutes.",
    acked: false,
    status: "WAITING_APPROVAL",
    system: "server-02",
    process: "system",
    pid: null
  },
    {
    id: "INC-1049",
    level: "P1 - High",
    tone: "warning",
    age: "6m ago",
    title: "Memory Usage High - python",
    body: "Memory usage reached 87.2%, above the 80% threshold for 5 minutes.",
    acked: false,
    status: "HEALING",
    system: "server-01",
    process: "python-app",
    pid: 9231
  },
]


export function useAlerts() {
  const [alerts, setAlerts] = useState(INITIAL_ALERTS)

  const socketAlert = useWebSocket('alerts')

  useEffect(() => {

    if (!socketAlert) {
      return
    }

    setAlerts((prev) => [
      socketAlert,
      ...prev
    ])

  }, [socketAlert])

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
    setAlerts,
    acknowledgeAlert,
    resolveAlert,
    criticalCount: alerts.filter((a) => a.tone === 'danger').length,
  }
}
