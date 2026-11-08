import React, { useCallback, useEffect, useState } from "react"
import { AlertCircle, Eye, Plus, RefreshCw, Shield, Target, TrendingUp } from "lucide-react"
import { Panel } from "@/components/kit"
import { cn } from "@/utils/cn"
import { getUserRules } from "@/services/api"
import { INITIAL_FORM } from "./steps/wizardConstants"
import { WizardProgress, StepNav } from "./steps/wizardComponents"
import Step1 from "./steps/Step1"
import Step2 from "./steps/Step2"
import Step3 from "./steps/Step3"
import Step4 from "./steps/Step4"
import Step5 from "./steps/Step5"
import Step6 from "./steps/Step6"
import Step7 from "./steps/Step7"
import Step8 from "./steps/Step8"
import Step9 from "./steps/Step9"
import Step10 from "./steps/Step10"
import Step11 from "./steps/Step11"
import Step12 from "./steps/Step12"
import Step13 from "./steps/Step13"

const STATS = [
  { label: "Active Rules", value: "0", hint: "Loaded from database", tone: "text-primary" },
  { label: "Policies", value: "15", hint: "↑ 3 from last week", tone: "text-primary" },
  { label: "Auto-Healing", value: "38", hint: "90.5% success rate", tone: "text-primary" },
  { label: "Pending Approvals", value: "2", hint: "Requires action", tone: "text-warning" },
]
const TABS = [
  { id: "all-user_rules", label: "All Rules" },
  { id: "create-rule", label: "Create Rule" },
  { id: "policies", label: "Policies" },
  { id: "approval-requests", label: "Approval Requests", badge: 2 },
  { id: "execution-history", label: "Execution History" },
]

export default function PolicyPage() {
  const [activeTab, setActiveTab] = useState("all-user_rules")
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL_FORM)
  const [rules, setRules] = useState([])
  const [rulesLoading, setRulesLoading] = useState(false)
  const [rulesError, setRulesError] = useState("")

  const loadRules = useCallback(async () => {
    setRulesLoading(true)
    setRulesError("")
    try {
      setRules(await getUserRules(1))
    } catch (error) {
      setRulesError(error.message || "Failed to load rules")
    } finally {
      setRulesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "all-user_rules") loadRules()
  }, [activeTab, loadRules])

  const stats = STATS.map(stat => stat.label === "Active Rules"
    ? { ...stat, value: rules.filter(({ rule }) => rule.status === "ENABLED").length, hint: "From database" }
    : stat)

  const formatDuration = seconds => {
    if (seconds == null) return "—"
    if (seconds >= 3600) return `${seconds / 3600}h`
    if (seconds >= 60) return `${seconds / 60}m`
    return `${seconds}s`
  }

  const renderRules = () => {
    if (rulesLoading) return <Panel className="flex items-center justify-center gap-3 py-20"><RefreshCw className="size-4 animate-spin text-primary" /><span className="font-mono text-sm text-muted-foreground">Loading rules from database…</span></Panel>
    if (rulesError) return <Panel className="flex flex-col items-center justify-center gap-3 py-16 text-center"><AlertCircle className="size-8 text-destructive" /><p className="font-mono text-sm text-destructive">{rulesError}</p><button onClick={loadRules} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-4 font-mono text-xs hover:bg-secondary"><RefreshCw className="size-3.5" /> Retry</button></Panel>
    if (!rules.length) return <Panel className="flex flex-col items-center justify-center gap-4 py-20"><Shield className="size-10 text-muted-foreground/30" /><p className="font-mono text-sm text-muted-foreground">No rules found in the database</p><button onClick={() => { setActiveTab("create-rule"); setStep(1) }} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary/10 border border-primary/20 px-4 font-mono text-xs text-primary hover:bg-primary/20 transition-colors cursor-pointer"><Plus className="size-3.5" /> Create New Rule</button></Panel>

    return <div className="grid grid-cols-1 gap-4">{rules.map(({ rule, targets = [], metrics = [], actions = [], notifications = [] }) => (
      <Panel key={rule.id} className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div><div className="flex items-center gap-3"><h2 className="text-lg font-semibold">{rule.name}</h2><span className={cn("rounded border px-2 py-0.5 font-mono text-[10px] uppercase", rule.status === "ENABLED" ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{rule.status || "UNKNOWN"}</span></div><p className="mt-1 font-mono text-[11px] text-muted-foreground">ID #{rule.id} · {rule.monitor_type} · {rule.environment || "No environment"} · {rule.region || "No region"}</p></div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground"><span>Priority: <b className="text-foreground">{rule.priority || "—"}</b></span><span>Severity: <b className="text-warning">{rule.severity || "—"}</b></span></div>
        </div>
        <div className="grid gap-4 px-5 py-4 md:grid-cols-4">
          <div><p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Targets</p>{targets.length ? targets.map((target, index) => <p key={index} className="flex items-center gap-2 font-mono text-xs"><Target className="size-3 text-primary" />{target.target}{target.host ? ` @ ${target.host}` : ""}</p>) : <p className="font-mono text-xs text-muted-foreground">—</p>}</div>
          <div><p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Conditions</p>{metrics.length ? metrics.map(metric => <p key={metric.id} className="font-mono text-xs">{metric.metric} {metric.operator} {metric.threshold ?? "—"} <span className="text-muted-foreground">({formatDuration(metric.duration_seconds)})</span></p>) : <p className="font-mono text-xs text-muted-foreground">—</p>}</div>
          <div><p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Actions</p>{actions.length ? actions.map((action, index) => <p key={index} className="font-mono text-xs">{action.action_type}</p>) : <p className="font-mono text-xs text-muted-foreground">—</p>}</div>
          <div><p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Notifications</p>{notifications.length ? <p className="font-mono text-xs">{[...new Set(notifications.map(notification => notification.channel))].join(", ")}</p> : <p className="font-mono text-xs text-muted-foreground">—</p>}</div>
        </div>
        <div className="flex items-center justify-between border-t border-border bg-secondary/10 px-5 py-2.5"><span className="font-mono text-[10px] text-muted-foreground">Owner: {rule.owner || "Unassigned"}</span><button type="button" className="inline-flex items-center gap-1.5 font-mono text-[10px] text-primary hover:underline"><Eye className="size-3" /> View details</button></div>
      </Panel>
    ))}</div>
  }

  const handleNext = () => setStep(s => {
    if (form.monitorSource === "disk") {
      const targetField = form.targetType === "Disk / Device" ? form.device : form.targetType === "Filesystem / Mount Point" || form.targetType === "Partition (Mount Point)" ? form.mountPoint : true
      const required = { 4: [form.metric, form.targetType, form.host, targetField], 5: [form.condOperator, form.condThreshold, form.condDuration], 6: [form.severity], 7: [form.actionTypes?.length], 10: [form.recoveryMetric || form.metric, form.recoveryThreshold, form.recoveryDuration] }
      if (required[s]?.some(value => !value)) return s
    }
    return Math.min(13, s + 1)
  })
  const handleBack = () => { if (step === 1) setActiveTab("all-user_rules"); else setStep(s => Math.max(1, s - 1)) }
  const exitWizard = () => setActiveTab("all-user_rules")

  const renderStep = () => {
    switch (step) {
      case 1:  return <Step1 form={form} setForm={setForm} onNext={handleNext} onCancel={exitWizard} />
      case 2:  return <Step2 form={form} setForm={setForm} />
      case 3:  return <Step3 form={form} setForm={setForm} />
      case 4:  return <Step4 form={form} setForm={setForm} />
      case 5:  return <Step5 form={form} setForm={setForm} />
      case 6:  return <Step6 form={form} setForm={setForm} />
      case 7:  return <Step7 form={form} setForm={setForm} />
      case 8:  return <Step8 form={form} setForm={setForm} />
      case 9:  return <Step9 form={form} setForm={setForm} />
      case 10: return <Step10 form={form} setForm={setForm} />
      case 11: return <Step11 form={form} setForm={setForm} />
      case 12: return <Step12 form={form} setForm={setForm} />
      case 13: return <Step13 form={form} onCancel={exitWizard} setForm={setForm}/>
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Policy & Rules Engine</h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground leading-relaxed">Define intelligent policies and self-healing rules that drive autonomous remediation across your infrastructure.</p>
        </div>
        <button onClick={() => { setActiveTab("create-rule"); setStep(1); }} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-primary px-5 font-mono text-[12px] font-bold tracking-wider text-primary-foreground hover:bg-primary/90 shadow-glow-primary transition-colors cursor-pointer">
          <Plus className="size-4" /> Create New Rule
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(s => (
          <Panel key={s.label} className="p-4 flex flex-col gap-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</p>
            <p className="text-3xl font-bold tracking-tight">{s.value}</p>
            <div className="flex items-center gap-1"><TrendingUp className={cn("size-3 shrink-0", s.tone)} /><span className={cn("font-mono text-[10px]", s.tone)}>{s.hint}</span></div>
          </Panel>
        ))}
      </div>

      <div className="flex items-center border-b border-border overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); if (t.id === "create-rule") setStep(1); }}
            className={cn("flex items-center gap-1.5 px-4 py-2.5 font-mono text-[12px] tracking-wide whitespace-nowrap transition-colors cursor-pointer border-b-2 -mb-px", activeTab === t.id ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}>
            {t.label}
            {t.badge != null && <span className="flex size-4 items-center justify-center rounded-full bg-red-900/80 text-[9px] font-bold text-red-200">{t.badge}</span>}
          </button>
        ))}
      </div>

      {activeTab === "create-rule" ? (
        <div className="space-y-4">
          <WizardProgress current={step} />
          {renderStep()}
          {step > 1 && step < 13 && (
            <StepNav current={step} onBack={handleBack} onNext={handleNext} nextLabel={step === 12 ? "Review" : "Next"} />
          )}
        </div>
      ) : activeTab === "all-user_rules" ? renderRules() : (
        <Panel className="flex flex-col items-center justify-center gap-4 py-20"><Shield className="size-10 text-muted-foreground/30" /><p className="font-mono text-sm text-muted-foreground">{TABS.find(t => t.id === activeTab)?.label} — Click "Create New Rule" to get started</p><button onClick={() => { setActiveTab("create-rule"); setStep(1); }} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary/10 border border-primary/20 px-4 font-mono text-xs text-primary hover:bg-primary/20 transition-colors cursor-pointer"><Plus className="size-3.5" /> Create New Rule</button></Panel>
      )}
    </div>
  )
}
