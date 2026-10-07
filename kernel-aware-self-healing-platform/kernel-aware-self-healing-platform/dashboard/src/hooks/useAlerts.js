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
]

const ALERTS_STORAGE_KEY = 'kernel-sentinel-active-alerts'

function loadActiveAlerts() {
  try {
    const storedAlerts = window.localStorage.getItem(ALERTS_STORAGE_KEY)
    if (storedAlerts === null) {
      return INITIAL_ALERTS
    }

    const parsedAlerts = JSON.parse(storedAlerts)
    if (!Array.isArray(parsedAlerts)) {
      throw new TypeError('Saved alerts must be an array')
    }

    return parsedAlerts
  } catch (error) {
    console.error('Unable to restore active alerts from browser storage:', error)
    return INITIAL_ALERTS
  }
}

function getAlertKey(alert) {
  const ruleId = alert.rule_id ?? alert.ruleId
  if (ruleId !== undefined && ruleId !== null) {
    return `rule:${ruleId}`
  }

  return [
    alert.title,
    alert.system,
    alert.process
  ]
    .map((value) => String(value ?? '').trim().toLowerCase())
    .join('|')
}

export function useAlerts() {
  const [alerts, setAlerts] = useState(loadActiveAlerts)

  const socketAlert = useWebSocket('alerts')

  useEffect(() => {
    try {
      window.localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts))
    } catch (error) {
      console.error('Unable to save active alerts to browser storage:', error)
    }
  }, [alerts])

  useEffect(() => {

    if (!socketAlert) {
      return
    }

    setAlerts((previousAlerts) => {
      const key = getAlertKey(socketAlert)
      const existingAlert = previousAlerts.find(
        (alert) => getAlertKey(alert) === key
      )
      const updatedAlert = {
        ...socketAlert,
        updatedAt: Date.now(),
        acked: existingAlert ? existingAlert.acked : Boolean(socketAlert.acked),
        id: existingAlert ? existingAlert.id : socketAlert.id
      }

      if (!existingAlert) {
        return [updatedAlert, ...previousAlerts]
      }

      return previousAlerts.map((alert) =>
        getAlertKey(alert) === key ? updatedAlert : alert
      )
    })

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
