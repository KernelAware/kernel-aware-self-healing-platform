import React, { useCallback, useEffect, useState } from "react"
import { AlertCircle, AlertTriangle, ChevronDown, Eye, Info, Lock, Pencil, Plus, RefreshCw, Save, Shield, Target, Trash2, TrendingUp, X } from "lucide-react"
import { Panel } from "@/components/kit"
import { cn } from "@/utils/cn"
import { deleteUserRule, getUserRules, updateUserRule } from "@/services/api"
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

const EDIT_OPERATORS = [
  { value: ">=", label: "Greater Than or Equal (>=)" },
  { value: ">", label: "Greater Than (>)" },
  { value: "<=", label: "Less Than or Equal (<=)" },
  { value: "<", label: "Less Than (<)" },
  { value: "=", label: "Equal (=)" },
]

function EditField({ label, required, hint, children, className = "" }) {
  return <label className={cn("block space-y-2", className)}>
    <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-foreground">{label}{required && <span className="text-destructive">*</span>}{hint && <Info className="size-3 text-muted-foreground" />}</span>
    {children}
  </label>
}

const editInputClass = "h-8 w-full rounded-md border border-input bg-background/70 px-2.5 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/40"
const editSelectClass = `${editInputClass} appearance-none pr-9`

function EditRuleModal({ ruleData, onClose, onSaved }) {
  const { rule, metrics = [] } = ruleData
  const metric = metrics[0] || {}
  const [form, setForm] = useState({
    name: rule.name || "",
    enabled: rule.status === "ENABLED",
    priority: (rule.priority || "MEDIUM").toUpperCase(),
    severity: (rule.severity || "WARNING").toUpperCase(),
    threshold: metric.threshold ?? "",
    operator: metric.operator || ">=",
    duration: metric.duration_seconds ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const setValue = (field, value) => setForm(current => ({ ...current, [field]: value }))

  const save = async event => {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      await updateUserRule(rule.id, {
        name: form.name.trim(),
        status: form.enabled ? "ENABLED" : "DISABLED",
        priority: form.priority,
        severity: form.severity,
        metric: {
          operator: form.operator,
          threshold: form.threshold === "" ? null : Number(form.threshold),
          duration_seconds: form.duration === "" ? null : Number(form.duration),
        },
      })
      onSaved()
    } catch (saveError) {
      setError(saveError.message || "Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  return <div className="fixed inset-0 z-50 flex min-h-full items-center justify-center overflow-y-auto bg-black/80 p-3" role="dialog" aria-modal="true" aria-labelledby="edit-rule-title" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <form onSubmit={save} className="w-full max-w-[540px] overflow-hidden rounded-lg border border-muted-foreground/50 bg-background shadow-2xl shadow-black/70">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-md bg-primary/15"><Pencil className="size-4 text-primary" /></span><div className="flex items-baseline gap-2"><h2 id="edit-rule-title" className="text-base font-semibold">Edit Rule</h2><span className="font-mono text-[10px] text-muted-foreground">Rule ID: #{rule.id}</span></div><span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold", form.enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}><span className={cn("size-1.5 rounded-full", form.enabled ? "bg-primary" : "bg-muted-foreground")} />{form.enabled ? "ENABLED" : "DISABLED"}</span></div>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Close edit form"><X className="size-5" /></button>
      </div>

      <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
        <section className="rounded-md border border-border bg-card/30 p-3">
          <div className="mb-3 flex items-center gap-2 border-b border-border pb-2"><ChevronDown className="size-3.5 text-primary" /><h3 className="text-xs font-semibold">General Information</h3></div>
          <div className="grid gap-3 md:grid-cols-2">
            <EditField label="Rule Name" required><input autoFocus required value={form.name} onChange={event => setValue("name", event.target.value)} className={editInputClass} /></EditField>
            <EditField label="Status"><div className="flex h-8 items-center gap-2.5"><button type="button" role="switch" aria-checked={form.enabled} onClick={() => setValue("enabled", !form.enabled)} className={cn("relative h-5 w-10 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40", form.enabled ? "bg-primary" : "bg-muted")}><span className={cn("absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-200", form.enabled ? "translate-x-5" : "translate-x-0")} /></button><span className="shrink-0 font-mono text-[11px]">{form.enabled ? "Enabled" : "Disabled"}</span></div><p className="font-mono text-[9px] text-muted-foreground">Enable or disable this rule.</p></EditField>
            <EditField label="Priority"><div className="relative"><select value={form.priority} onChange={event => setValue("priority", event.target.value)} className={editSelectClass}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3 size-3.5 text-muted-foreground" /></div></EditField>
            <EditField label="Severity" hint=""><div className="relative"><select value={form.severity} onChange={event => setValue("severity", event.target.value)} className={editSelectClass}><option value="Low">Low</option><option value="Warning">Warning</option><option value="High">High</option><option value="Critical">Critical</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3 size-3.5 text-muted-foreground" /></div></EditField>
          </div>
        </section>

        <section className="rounded-md border border-border bg-card/30 p-3">
          <div className="mb-3 flex items-center gap-2 border-b border-border pb-2"><ChevronDown className="size-3.5 text-primary" /><h3 className="text-xs font-semibold">Rule Conditions</h3></div>
          <div className="grid gap-3 md:grid-cols-2">
            <EditField label="Existing Metric" hint=""><div className="relative"><input value={metric.metric || "No metric configured"} readOnly className={`${editInputClass} pr-9 text-muted-foreground`} /><Lock className="absolute right-3 top-3 size-3.5 text-muted-foreground" /></div><p className="font-mono text-[10px] text-muted-foreground">Read-only — the metric cannot be changed.</p></EditField>
            <EditField label="Operator" hint=""><div className="relative"><select value={form.operator} onChange={event => setValue("operator", event.target.value)} className={editSelectClass}>{EDIT_OPERATORS.map(operator => <option key={operator.value} value={operator.value}>{operator.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 size-3.5 text-muted-foreground" /></div></EditField>
            <EditField label="Threshold" hint=""><input type="number" step="any" value={form.threshold} onChange={event => setValue("threshold", event.target.value)} placeholder="Enter value..." className={editInputClass} /></EditField>
            <EditField label="Duration (seconds)" hint=""><input type="number" min="0" value={form.duration} onChange={event => setValue("duration", event.target.value)} placeholder="Enter duration..." className={editInputClass} /></EditField>
          </div>
        </section>
        {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">{error}</p>}
      </div>

      <div className="flex justify-end gap-2 border-t border-border bg-secondary/10 px-4 py-3"><button type="button" onClick={onClose} className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-3 font-mono text-[11px] font-semibold hover:bg-secondary">Cancel</button><button disabled={saving} className="inline-flex h-8 items-center gap-2 rounded-md bg-primary px-3 font-mono text-[11px] font-bold text-primary-foreground shadow-glow-primary hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"><Save className="size-3" />{saving ? "Saving..." : "Save Changes"}</button></div>
    </form>
  </div>
}

function DeleteRuleModal({ rule, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  const confirmDelete = async () => {
    setDeleting(true)
    setError("")
    try {
      await deleteUserRule(rule.id)
      onDeleted()
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete rule")
      setDeleting(false)
    }
  }

  return <div className="fixed inset-0 z-50 flex min-h-full items-center justify-center bg-black/80 p-3" role="dialog" aria-modal="true" aria-labelledby="delete-rule-title" onMouseDown={event => { if (event.target === event.currentTarget && !deleting) onClose() }}>
    <div className="w-full max-w-[420px] overflow-hidden rounded-lg border border-muted-foreground/50 bg-background shadow-2xl shadow-black/70">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3"><span className="flex size-8 items-center justify-center rounded-md bg-destructive/15"><AlertTriangle className="size-4 text-destructive" /></span><div><h2 id="delete-rule-title" className="text-sm font-semibold">Delete Rule</h2><p className="font-mono text-[10px] text-muted-foreground">Permanent database removal</p></div><button type="button" onClick={onClose} disabled={deleting} className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50" aria-label="Close delete confirmation"><X className="size-4" /></button></div>
      <div className="space-y-3 px-4 py-4"><p className="text-sm text-foreground">Are you sure you want to delete <span className="font-semibold text-destructive">“{rule.name}”</span>?</p><p className="font-mono text-[10px] leading-relaxed text-muted-foreground">This will permanently delete the rule and all of its targets, conditions, actions, notifications, recovery settings, and integration configuration from the database.</p>{error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-[10px] text-destructive">{error}</p>}</div>
      <div className="flex justify-end gap-2 border-t border-border bg-secondary/10 px-4 py-3"><button type="button" onClick={onClose} disabled={deleting} className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-3 font-mono text-[11px] font-semibold hover:bg-secondary disabled:opacity-50">Cancel</button><button type="button" onClick={confirmDelete} disabled={deleting} className="inline-flex h-8 items-center gap-2 rounded-md bg-destructive px-3 font-mono text-[11px] font-bold text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"><Trash2 className="size-3" />{deleting ? "Deleting..." : "Delete Rule"}</button></div>
    </div>
  </div>
}

export default function PolicyPage() {
  const [activeTab, setActiveTab] = useState("all-user_rules")
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL_FORM)
  const [rules, setRules] = useState([])
  const [rulesLoading, setRulesLoading] = useState(false)
  const [rulesError, setRulesError] = useState("")
  const [editingRule, setEditingRule] = useState(null)
  const [deletingRule, setDeletingRule] = useState(null)

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

    return <div className="grid grid-cols-1 gap-4">{rules.map(({ rule, targets = [], metrics = [], actions = [], notifications = [], ...ruleData }) => (
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
        <div className="flex items-center justify-between border-t border-border bg-secondary/10 px-5 py-2.5"><span className="font-mono text-[10px] text-muted-foreground">Owner: {rule.owner || "Unassigned"}</span><div className="flex items-center gap-4"><button type="button" onClick={() => setEditingRule({ rule, targets, metrics, actions, notifications, ...ruleData })} className="inline-flex items-center gap-1.5 font-mono text-[10px] text-primary hover:underline"><Pencil className="size-3" /> Edit</button><button type="button" onClick={() => setDeletingRule(rule)} className="inline-flex items-center gap-1.5 font-mono text-[10px] text-destructive hover:underline"><Trash2 className="size-3" /> Delete</button><button type="button" className="inline-flex items-center gap-1.5 font-mono text-[10px] text-primary hover:underline"><Eye className="size-3" /> View details</button></div></div>
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
      {editingRule && <EditRuleModal ruleData={editingRule} onClose={() => setEditingRule(null)} onSaved={async () => { setEditingRule(null); await loadRules() }} />}
      {deletingRule && <DeleteRuleModal rule={deletingRule} onClose={() => setDeletingRule(null)} onDeleted={async () => { setDeletingRule(null); await loadRules() }} />}
    </div>
  )
}
