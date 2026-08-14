import React, { useState } from 'react'
import {
  Plus,
  ChevronRight,
  ChevronDown,
  X,
  ArrowRight,
  TrendingUp,
  Activity,
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  Circle,
  BarChart3,
  Shield,
} from 'lucide-react'
import { Panel, ActionButton, Dot } from '@/components/kit'
import { cn } from '@/utils/cn'

/* ─── static data ─────────────────────────────────────── */
const STATS = [
  { label: 'Active Rules', value: '42', hint: '↑ 8 from last week', hintTone: 'text-primary' },
  { label: 'Policies', value: '15', hint: '↑ 3 from last week', hintTone: 'text-primary' },
  { label: 'Auto-Healing', value: '38', hint: '90.5% success rate', hintTone: 'text-primary' },
  { label: 'Pending Approvals', value: '2', hint: 'Requires action', hintTone: 'text-warning' },
]

const TABS = [
  { id: 'all-rules', label: 'All Rules' },
  { id: 'create-rule', label: 'Create Rule' },
  { id: 'policies', label: 'Policies' },
  { id: 'approval-requests', label: 'Approval Requests', badge: 2 },
  { id: 'execution-history', label: 'Execution History' },
]

const STEPS = [
  { num: 1, label: 'Basic Info' },
  { num: 2, label: 'Scope' },
  { num: 3, label: 'Monitor' },
  { num: 4, label: 'Target & Metric' },
  { num: 5, label: 'Conditions' },
  { num: 6, label: 'Severity' },
  { num: 7, label: 'Actions' },
  { num: 8, label: 'Safety' },
  { num: 9, label: 'Retry & Cooldown' },
  { num: 10, label: 'Verification' },
  { num: 11, label: 'Notifications' },
  { num: 12, label: 'Schedule' },
  { num: 13, label: 'Review' },
]

const SUMMARY_ITEMS = [
  { label: 'Monitored Source', value: 'Not selected', icon: CheckCircle, iconTone: 'text-primary/50', valueTone: 'text-muted-foreground' },
  { label: 'Target', value: 'Not selected', icon: CheckCircle, iconTone: 'text-primary/50', valueTone: 'text-muted-foreground' },
  { label: 'Condition', value: 'Not configured', icon: Activity, iconTone: 'text-warning/60', valueTone: 'text-muted-foreground' },
  { label: 'Action', value: 'Not configured', icon: CheckCircle, iconTone: 'text-primary/50', valueTone: 'text-muted-foreground' },
  { label: 'Verification', value: 'Not configured', icon: CheckCircle, iconTone: 'text-primary/50', valueTone: 'text-muted-foreground' },
  { label: 'Auto-Healing', value: 'Not configured', icon: AlertTriangle, iconTone: 'text-warning', valueTone: 'text-muted-foreground' },
  { label: 'Status', value: '● Enabled', icon: CheckCircle, iconTone: 'text-primary/50', valueTone: 'text-primary' },
]

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low']
const OWNERS = ['Admin', 'DevOps', 'SRE Team', 'Security']

/* ─── Tag pill ────────────────────────────────────────── */
function Tag({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-secondary/70 border border-border px-2 py-0.5 font-mono text-[11px] text-foreground">
      {label}
      <button
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-0.5"
      >
        <X className="size-2.5" />
      </button>
    </span>
  )
}

/* ─── Step circle ─────────────────────────────────────── */
function StepIndicator({ step, current }) {
  const done = step.num < current
  const active = step.num === current
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div
        className={cn(
          'flex size-7 items-center justify-center rounded-full border-2 font-mono text-[11px] font-bold transition-all shrink-0',
          active
            ? 'border-primary bg-primary text-primary-foreground shadow-glow-primary'
            : done
            ? 'border-primary/50 bg-primary/15 text-primary'
            : 'border-border bg-card text-muted-foreground',
        )}
      >
        {done ? <CheckCircle className="size-3.5" /> : step.num}
      </div>
      <span
        className={cn(
          'font-mono text-[9px] tracking-wide text-center leading-tight w-14 text-center',
          active ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        {step.label}
      </span>
    </div>
  )
}

/* ─── Toggle ──────────────────────────────────────────── */
function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-secondary',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}

/* ─── Priority colored dot ────────────────────────────── */
function PriorityDot({ priority }) {
  const map = {
    Critical: 'bg-destructive',
    High: 'bg-warning',
    Medium: 'bg-accent',
    Low: 'bg-muted-foreground',
  }
  return (
    <span
      className={cn('inline-block size-2 rounded-full', map[priority] ?? 'bg-muted-foreground')}
    />
  )
}

/* ─── Page ────────────────────────────────────────────── */
export default function PolicyPage() {
  const [activeTab, setActiveTab] = useState('create-rule')
  const [currentStep, setCurrentStep] = useState(1)

  const [ruleName, setRuleName] = useState('High Host CPU')
  const [description, setDescription] = useState(
    'Detect sustained CPU pressure on production hosts\nand create an alert.',
  )
  const [enabled, setEnabled] = useState(true)
  const [priority, setPriority] = useState('High')
  const [owner, setOwner] = useState('Admin')
  const [tags, setTags] = useState(['cpu', 'performance', 'auto-heal'])
  const [tagInput, setTagInput] = useState('')

  const NAME_MAX = 100
  const DESC_MAX = 255

  const addTag = (val) => {
    const v = val.trim().toLowerCase()
    if (v && !tags.includes(v)) setTags((prev) => [...prev, v])
    setTagInput('')
  }

  const removeTag = (t) => setTags((prev) => prev.filter((x) => x !== t))

  const handleTagKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Policy &amp; Rules Engine</h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground leading-relaxed">
            Define intelligent policies and self-healing rules that drive autonomous remediation
            across your infrastructure.
          </p>
        </div>
        <button
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-primary px-5 font-mono text-[12px] font-bold tracking-wider text-primary-foreground hover:bg-primary/90 shadow-glow-primary transition-colors cursor-pointer"
        >
          <Plus className="size-4" />
          Create New Rule
        </button>
      </div>

      {/* ── Stats ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((s) => (
          <Panel key={s.label} className="p-4 flex flex-col gap-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</p>
            <p className="text-3xl font-bold tracking-tight">{s.value}</p>
            <div className="flex items-center gap-1">
              <TrendingUp className={cn('size-3 shrink-0', s.hintTone)} />
              <span className={cn('font-mono text-[10px]', s.hintTone)}>{s.hint}</span>
            </div>
          </Panel>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────── */}
      <div className="flex items-center border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 font-mono text-[12px] tracking-wide whitespace-nowrap transition-colors cursor-pointer border-b-2 -mb-px',
              activeTab === t.id
                ? 'text-primary border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground',
            )}
          >
            {t.label}
            {t.badge != null && (
              <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Create Rule tab ─────────────────────────── */}
      {activeTab === 'create-rule' && (
        <div className="flex gap-5 items-start">

          {/* ── Left: wizard + form ─────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Step wizard bar */}
            <Panel className="p-4">
              <div className="flex items-start gap-1 overflow-x-auto">
                {STEPS.map((step, idx) => (
                  <React.Fragment key={step.num}>
                    <StepIndicator step={step} current={currentStep} />
                    {idx < STEPS.length - 1 && (
                      <div
                        className={cn(
                          'flex-1 h-px mt-3.5 min-w-[8px] shrink transition-colors',
                          step.num < currentStep ? 'bg-primary/40' : 'bg-border',
                        )}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </Panel>

            {/* Basic Info form */}
            <Panel className="p-5">
              {/* Section title */}
              <div className="mb-5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
                  1. Basic Information
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Define the basic details for your rule.
                </p>
              </div>

              <div className="space-y-5">
                {/* Rule Name */}
                <div>
                  <label className="block font-mono text-[11px] text-foreground mb-1.5">
                    Rule Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={ruleName}
                    maxLength={NAME_MAX}
                    onChange={(e) => setRuleName(e.target.value)}
                    className="w-full rounded-md border border-border bg-card px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none transition-colors"
                    placeholder="e.g. High Host CPU"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      A human-readable name for this rule.
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {ruleName.length} / {NAME_MAX}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block font-mono text-[11px] text-foreground mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={description}
                    maxLength={DESC_MAX}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-md border border-border bg-card px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none transition-colors"
                    placeholder="Describe what this rule does…"
                  />
                  <div className="flex justify-end">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {description.length} / {DESC_MAX}
                    </span>
                  </div>
                </div>

                {/* Status / Priority / Owner */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Status */}
                  <div>
                    <label className="block font-mono text-[11px] text-foreground mb-1.5">Status</label>
                    <div className="flex items-center gap-2.5 rounded-md border border-border bg-card px-3 py-2.5 h-[42px]">
                      <Toggle checked={enabled} onChange={setEnabled} />
                      <span className="font-mono text-xs text-foreground">
                        {enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      Enable or disable this rule.
                    </p>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block font-mono text-[11px] text-foreground mb-1.5">
                      Priority <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                        <PriorityDot priority={priority} />
                      </div>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full appearance-none rounded-md border border-border bg-card pl-7 pr-8 py-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none cursor-pointer h-[42px]"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p} className="bg-card">
                            {p}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      Select the rule priority.
                    </p>
                  </div>

                  {/* Owner */}
                  <div>
                    <label className="block font-mono text-[11px] text-foreground mb-1.5">
                      Rule Owner <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={owner}
                        onChange={(e) => setOwner(e.target.value)}
                        className="w-full appearance-none rounded-md border border-border bg-card px-3 pr-8 py-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none cursor-pointer h-[42px]"
                      >
                        {OWNERS.map((o) => (
                          <option key={o} value={o} className="bg-card">
                            {o}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      Who owns this rule.
                    </p>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block font-mono text-[11px] text-foreground mb-1.5">
                    Tags (Optional)
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 min-h-[42px]">
                    {tags.map((t) => (
                      <Tag key={t} label={t} onRemove={() => removeTag(t)} />
                    ))}
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKey}
                      onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
                      placeholder="Add tag…"
                      className="flex-1 min-w-[80px] bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                    <ChevronDown className="ml-auto size-3.5 text-muted-foreground shrink-0" />
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    Add tags to categorize this rule.
                  </p>
                </div>
              </div>

              {/* Footer actions */}
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                  className="h-9 rounded-md border border-border bg-card px-5 font-mono text-xs text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setCurrentStep(Math.min(STEPS.length, currentStep + 1))}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-5 font-mono text-xs font-bold tracking-wide text-primary-foreground hover:bg-primary/90 shadow-glow-primary transition-colors cursor-pointer"
                >
                  Next <ArrowRight className="size-3.5" />
                </button>
              </div>
            </Panel>
          </div>

          {/* ── Right: Rule Summary ──────────────────── */}
          <div className="w-60 shrink-0">
            <Panel className="p-4">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Rule Summary (Preview)
              </p>

              <div className="space-y-3">
                {SUMMARY_ITEMS.map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="flex items-start gap-2">
                      <Icon className={cn('size-3.5 mt-0.5 shrink-0', item.iconTone)} />
                      <div>
                        <p className="font-mono text-[11px] font-medium text-foreground leading-tight">
                          {item.label}
                        </p>
                        <p className={cn('font-mono text-[10px] leading-tight mt-0.5', item.valueTone)}>
                          {item.value}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Estimated Impact */}
              <div className="mt-5 rounded-md border border-warning/25 bg-warning/5 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <BarChart3 className="size-3.5 text-warning" />
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-warning">
                    Estimated Impact
                  </p>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground leading-snug">
                  This rule will impact 0 hosts and monitor 0 resources
                </p>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* ── Other tabs placeholder ───────────────────── */}
      {activeTab !== 'create-rule' && (
        <Panel className="flex flex-col items-center justify-center gap-4 py-20">
          <Shield className="size-10 text-muted-foreground/30" />
          <p className="font-mono text-sm text-muted-foreground">
            {TABS.find((t) => t.id === activeTab)?.label} — coming soon
          </p>
        </Panel>
      )}
    </div>
  )
}
