import { useState } from 'react'


const INITIAL_INCIDENTS = [
  {
    id: "INC-1042",

    title: "High CPU Usage - nginx",
    priority: "P0",
    severity: "Critical",
    system: "server-01",
    process: "nginx",
    pid: 8842,
    detectedAgo: "2m ago",

    trigger: {
      metric: "CPU Usage (%)",
      currentValue: "98.8%",
      operator: ">",
      threshold: "90%",
      duration: "5 minutes"
    },

    decision: {
      recommendedAction: "restart-service",
      decision: "RESTART",
      reason:
        "CPU usage remained above the configured threshold for 5 minutes."
    },

    policy: {
      ruleEnabled: true,
      automaticExecution: true,
      approvalRequired: true,
      cooldownPassed: true
    },

    rootCause: {
      verified: true,
      source: "eBPF Telemetry",
      traceId: "IX-9942",
      traceName: "Kernel Thread Staleness",

      timeline: [
        {
          time: "14:01:22.043",
          label: "Syscall Entry",
          title:
            "mmap(NULL, 134217728, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0)",
          note:
            "Process 'node' requested hugepage allocation beyond available VM limits.",
          tone: "warning"
        },
        {
          time: "14:01:23.901",
          label: "OOM Killer Triggered",
          title: "Kernel invoked oom_kill_process().",
          note:
            "Target PID: 8842 (ReplicaSet 0). Total RAM exhausted: 98.4%.",
          tone: "danger"
        },
        {
          time: "14:01:25.112",
          label: "Self-Healing Initiated",
          title: "Action: Container Scale-Up",
          note:
            "Spinning up additional replica in AZ-2 to offload traffic from degraded node.",
          tone: "success"
        }
      ]
    },

    operatorAction: {
      required: true,

      message:
        "Review the recommendation and select an approved remediation action.",

      recommendedAction: "restart-service",

      allowedActions: [
        "restart-service",
        "run-automation",
        "send-notification"
      ],

      selectedAction: "restart-service",

      reason:
        "CPU usage remained above the configured threshold for 5 minutes."
    },

    status: "WAITING_APPROVAL"
  },

  {
    id: "INC-1043",

    title: "Memory Usage High - python",
    priority: "P1",
    severity: "High",
    system: "server-01",
    process: "python-app",
    pid: 9231,
    detectedAgo: "6m ago",

    trigger: {
      metric: "Memory Usage (%)",
      currentValue: "87.2%",
      operator: ">",
      threshold: "80%",
      duration: "5 minutes"
    },

    decision: {
      recommendedAction: "restart-service",
      decision: "RESTART",
      reason:
        "Memory usage remained above the configured threshold for 5 minutes."
    },

    policy: {
      ruleEnabled: true,
      automaticExecution: true,
      approvalRequired: false,
      cooldownPassed: true
    },

    rootCause: {
      verified: true,
      source: "eBPF Telemetry",
      traceId: "IX-9943",
      traceName: "Memory Pressure",

      timeline: [
        {
          time: "14:10:02.100",
          label: "Memory Pressure",
          title: "Process memory increased rapidly.",
          note:
            "python-app exceeded the configured memory threshold.",
          tone: "warning"
        },
        {
          time: "14:10:05.220",
          label: "Threshold Violated",
          title: "Memory usage reached 87.2%.",
          note:
            "Configured threshold is 80% for 5 minutes.",
          tone: "danger"
        }
      ]
    },

    operatorAction: {
      required: false,

      message:
        "Automatic remediation is allowed by policy.",

      recommendedAction: "restart-service",

      allowedActions: [
        "restart-service",
        "send-notification"
      ],

      selectedAction: "restart-service",

      reason:
        "Memory usage remained above the configured threshold."
    },

    status: "HEALING"
  },

  {
  id: "INC-1044",

  title: "Disk Space Low - /var",
  priority: "P2",
  severity: "Medium",
  system: "server-02",
  process: "system",
  pid: null,
  detectedAgo: "15m ago",

  trigger: {
    metric: "Disk Usage (%)",
    currentValue: "92.8%",
    operator: ">",
    threshold: "80%",
    duration: "10 minutes"
  },

  decision: {
    recommendedAction: "run-automation",
    decision: "CLEANUP",
    reason:
      "Disk usage on /var remained above 80% for more than 10 minutes."
  },

  policy: {
    ruleEnabled: true,
    automaticExecution: false,
    approvalRequired: true,
    cooldownPassed: true
  },

  rootCause: {
    verified: true,
    source: "System Telemetry",
    traceId: "IX-9944",
    traceName: "Disk Space Exhaustion",

    timeline: [
      {
        time: "14:20:10.102",
        label: "Disk Threshold Warning",
        title: "/var disk usage exceeded 80%.",
        note:
          "Disk usage reached 82.1% and continued increasing.",
        tone: "warning"
      },

      {
        time: "14:25:44.512",
        label: "Log Growth Detected",
        title: "Large application logs detected.",
        note:
          "/var/log/application.log increased by 8.4 GB within 30 minutes.",
        tone: "danger"
      },

      {
        time: "14:30:01.884",
        label: "Critical Disk Usage",
        title: "/var disk usage reached 92.8%.",
        note:
          "Available disk space is below the configured safety threshold.",
        tone: "danger"
      }
    ]
  },

  operatorAction: {
    required: true,

    message:
      "Review and approve disk cleanup before execution.",

    recommendedAction: "run-automation",

    allowedActions: [
      "run-automation",
      "send-notification"
    ],

    selectedAction: "run-automation",

    reason:
      "Large log files are consuming disk space on /var."
  },

  status: "WAITING_APPROVAL"
},

    {
    id: "INC-1049",

    title: "Memory Usage High - python",
    priority: "P1",
    severity: "High",
    system: "server-01",
    process: "python-app",
    pid: 9231,
    detectedAgo: "6m ago",

    trigger: {
      metric: "Memory Usage (%)",
      currentValue: "87.2%",
      operator: ">",
      threshold: "80%",
      duration: "5 minutes"
    },

    decision: {
      recommendedAction: "restart-service",
      decision: "RESTART",
      reason:
        "Memory usage remained above the configured threshold for 5 minutes."
    },

    policy: {
      ruleEnabled: true,
      automaticExecution: true,
      approvalRequired: false,
      cooldownPassed: true
    },

    rootCause: {
      verified: true,
      source: "eBPF Telemetry",
      traceId: "IX-9943",
      traceName: "Memory Pressure",

      timeline: [
        {
          time: "14:10:02.100",
          label: "Memory Pressure",
          title: "Process memory increased rapidly.",
          note:
            "python-app exceeded the configured memory threshold.",
          tone: "warning"
        },
        {
          time: "14:10:05.220",
          label: "Threshold Violated",
          title: "Memory usage reached 87.2%.",
          note:
            "Configured threshold is 80% for 5 minutes.",
          tone: "danger"
        }
      ]
    },

    operatorAction: {
      required: false,

      message:
        "Automatic remediation is allowed by policy.",

      recommendedAction: "restart-service",

      allowedActions: [
        "restart-service",
        "send-notification"
      ],

      selectedAction: "restart-service",

      reason:
        "Memory usage remained above the configured threshold."
    },

    status: "HEALING"
  }
]


export function useIncidentDetails() {

  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS)

  const [selectedIncidentId, setSelectedIncidentId] = useState(
    INITIAL_INCIDENTS[0]?.id || null
  )
  const selectedIncident =
    incidents.find(
      (incident) => incident.id === selectedIncidentId
    ) || null

  const selectIncident = (id) => {
    setSelectedIncidentId(id)
  }

  const selectAction = (action) => {

    setIncidents((prev) =>
      prev.map((incident) =>
        incident.id === selectedIncidentId
          ? {
              ...incident,

              operatorAction: {
                ...incident.operatorAction,
                selectedAction: action
              }
            }
          : incident
      )
    )
  }


  const approveIncident = (id) => {

    setIncidents((prev) =>
      prev.map((incident) =>
        incident.id === id
          ? {
              ...incident,
              status: "HEALING"
            }
          : incident
      )
    )
  }

  const rejectIncident = (id) => {

    setIncidents((prev) =>
      prev.map((incident) =>
        incident.id === id
          ? {
              ...incident,
              status: "REJECTED"
            }
          : incident
      )
    )
  }

  const addIncident = (incident) => {

    setIncidents((prev) => [
      incident,
      ...prev
    ])
  }


  return {
    selectedIncident,
    selectedIncidentId,
    selectIncident,
    selectAction,

    approveIncident,
    rejectIncident,

    addIncident
  }
}