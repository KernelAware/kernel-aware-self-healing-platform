import {
  Cpu, HardDrive, Network, Server, ScrollText, Layers, Settings, Database, CircuitBoard,
  Activity, RefreshCw, Play, Square, X, Trash2, TrendingUp, Shield, Code, Terminal,
  Zap, Bell, Users,
} from "lucide-react"

export const STEP_DEFS = [
  { num: 1, label: "Basic Info" }, { num: 2, label: "Scope" }, { num: 3, label: "Monitor" },
  { num: 4, label: "Target & Metric" }, { num: 5, label: "Conditions" }, { num: 6, label: "Severity" },
  { num: 7, label: "Actions" }, { num: 8, label: "Safety" }, { num: 9, label: "Retry & Cooldown" },
  { num: 10, label: "Verification" }, { num: 11, label: "Notifications" }, { num: 12, label: "Schedule" }, { num: 13, label: "Review" },
]

export const MONITOR_SOURCES = [
  { id: "cpu", title: "CPU", desc: "Process get_metrics", icon: Cpu, cls: "bg-primary/20 text-primary" },
  { id: "memory", title: "Memory", desc: "Memory get_metrics", icon: Database, cls: "bg-accent/20 text-accent" },
  { id: "disk", title: "Disk", desc: "Disk & I/O get_metrics", icon: HardDrive, cls: "bg-warning/20 text-warning" },
  { id: "hardware", title: "Hardware", desc: "Hardware health", icon: CircuitBoard, cls: "bg-primary/20 text-primary" },
  { id: "network", title: "Network", desc: "Network get_metrics", icon: Network, cls: "bg-accent/20 text-accent" },
  { id: "process", title: "Process", desc: "Process get_metrics", icon: Activity, cls: "bg-warning/20 text-warning" },
  { id: "service", title: "Service", desc: "Service status", icon: Server, cls: "bg-primary/20 text-primary" },
  { id: "logs", title: "Logs", desc: "Log patterns", icon: ScrollText, cls: "bg-muted text-muted-foreground" },
  { id: "ebpf", title: "eBPF / Kernel", desc: "Kernel events", icon: Layers, cls: "bg-accent/20 text-accent" },
  { id: "custom", title: "Custom Metric", desc: "External/Custom get_metrics", icon: Settings, cls: "bg-muted text-muted-foreground" },
]

export const ACTION_TYPES = [
  { id: "alert", title: "Alert", desc: "Create incident and notify.", bg: "bg-emerald-700", icon: Shield },
  { id: "restart-service", title: "Restart Service", desc: "Restart a system service managed by the system.", bg: "bg-blue-600", icon: RefreshCw },
  { id: "start-service", title: "Start Service", desc: "Start a stopped service managed by the system.", bg: "bg-blue-600", icon: Play },
  { id: "stop-service", title: "Stop Service", desc: "Stop a running service managed by the system.", bg: "bg-orange-700", icon: Square },
  { id: "kill-process", title: "Kill Process", desc: "Terminate a misbehaving process.", bg: "bg-red-700", icon: X },
  { id: "clear-cache", title: "Clear Cache / Logs", desc: "Clear system cache or log files.", bg: "bg-red-800", icon: Trash2 },
  { id: "free-disk", title: "Free Disk Space", desc: "Free up disk space using system cleanup tasks.", bg: "bg-teal-700", icon: HardDrive },
  { id: "scale-resources", title: "Scale Resources", desc: "Scale infrastructure resources (compute / storage / network).", bg: "bg-yellow-700", icon: TrendingUp },
  { id: "isolate-node", title: "Isolate Node", desc: "Isolate the affected node from the cluster.", bg: "bg-purple-700", icon: Shield },
  { id: "run-automation", title: "Run Automation", desc: "Execute a predefined automation script.", bg: "bg-indigo-700", icon: Code },
  { id: "run-command", title: "Run Command", desc: "Execute a system command on the target host.", bg: "bg-slate-700", icon: Terminal },
  { id: "trigger-webhook", title: "Trigger Webhook", desc: "Trigger an external webhook integration.", bg: "bg-pink-700", icon: Zap },
  { id: "send-notification", title: "Send Notification", desc: "Send alert/notification to configured channels.", bg: "bg-amber-700", icon: Bell },
  { id: "create-incident", title: "Create Incident", desc: "Create an incident for tracking and manual investigation.", bg: "bg-blue-800", icon: Shield },
  { id: "require-approval", title: "Require Approval", desc: "Pause execution and wait for manual approval.", bg: "bg-slate-600", icon: Users },
]

export const ACTION_TYPES_PROCESSES = [
  { id: "alert", title: "Alert", desc: "Create incident and notify.", bg: "bg-emerald-700", icon: Shield },
  { id: "restart-service", title: "Restart Service / process", desc: "Restart a system service managed by the system.", bg: "bg-blue-600", icon: RefreshCw },
  { id: "start-service", title: "Start Service / process", desc: "Start a stopped service managed by the system.", bg: "bg-blue-600", icon: Play },
  { id: "stop-service", title: "Stop Service / process", desc: "Stop a running service managed by the system.", bg: "bg-orange-700", icon: Square },
  { id: "kill-process", title: "Kill Process / process", desc: "Terminate a misbehaving process.", bg: "bg-red-700", icon: X },
  { id: "run-automation", title: "Run Automation", desc: "Execute a predefined automation script.", bg: "bg-indigo-700", icon: Code },
  { id: "run-command", title: "Run Command", desc: "Execute a system command on the target host.", bg: "bg-slate-700", icon: Terminal },
  { id: "send-notification", title: "Send Notification", desc: "Send alert/notification to configured channels.", bg: "bg-amber-700", icon: Bell },
  { id: "create-incident", title: "Create Incident", desc: "Create an incident for tracking and manual investigation.", bg: "bg-blue-800", icon: Shield },
]

export const INITIAL_FORM = {
  ruleName: "", description: "",
  enabled: true, priority: "High", owner: "Admin", tags: [], tagInput: "",
  environment: "Production", region: "US-East-1", applyTo: "host-groups", hostGroups: [],
  monitorSource: "cpu", metric: "CPU Usage", targetType: "Host", host: "", interface: "eth0", direction: "Incoming", aggregation: "Average (Avg)", mountPoint: "/ (Root)", diskMetricCategory: "Disk",
  condMetric: "CPU Usage (%)", condOperator: "Greater Than (>)", condThreshold: "", condDuration: "", condInterval: "Every 30 seconds", condOccurrences: "", condOutOf: "",
  severity: "high", actionType: "create-incident", actionTypes: [],
  autoExec: false, approvalRequired: "always", allowedDuring: "always",
  cooldownPeriod: "", suppressDups: false, enableDedup: false,
  recoveryThreshold: "", recoveryDuration: "",
  notifyEvents: [],
  notifyChannels: [], notifyRecipients: [],
  schedule: "always", suppressMaintenance: false,
}
