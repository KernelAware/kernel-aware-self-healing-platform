import React, { useState } from "react"
import {
  Plus, ChevronDown, ChevronRight, X, ArrowRight, ArrowLeft, Check, Info,
  BarChart3, Shield, AlertTriangle, Activity, CheckCircle,
  Cpu, HardDrive, Network, Server, ScrollText, Layers, Settings, Database, CircuitBoard,
  RefreshCw, Play, Square, Trash2, Terminal, Bell, Users, Zap, Mail, Link2,
  Globe, TrendingUp, Star, MessageSquare, Code,
} from "lucide-react"
import { Panel, Dot } from "@/components/kit"
import { cn } from "@/utils/cn"

const STATS = [
  { label: "Active Rules", value: "42", hint: "↑ 8 from last week", tone: "text-primary" },
  { label: "Policies", value: "15", hint: "↑ 3 from last week", tone: "text-primary" },
  { label: "Auto-Healing", value: "38", hint: "90.5% success rate", tone: "text-primary" },
  { label: "Pending Approvals", value: "2", hint: "Requires action", tone: "text-warning" },
]
const TABS = [
  { id: "all-rules", label: "All Rules" },
  { id: "create-rule", label: "Create Rule" },
  { id: "policies", label: "Policies" },
  { id: "approval-requests", label: "Approval Requests", badge: 2 },
  { id: "execution-history", label: "Execution History" },
]
const STEP_DEFS = [
  { num: 1, label: "Basic Info" }, { num: 2, label: "Scope" }, { num: 3, label: "Monitor" },
  { num: 4, label: "Target & Metric" }, { num: 5, label: "Conditions" }, { num: 6, label: "Severity" },
  { num: 7, label: "Actions" }, { num: 8, label: "Safety" }, { num: 9, label: "Retry & Cooldown" },
  { num: 10, label: "Verification" }, { num: 11, label: "Notifications" }, { num: 12, label: "Schedule" }, { num: 13, label: "Review" },
]
const MONITOR_SOURCES = [
  { id: "cpu", title: "CPU", desc: "Process metrics", icon: Cpu, cls: "bg-primary/20 text-primary" },
  { id: "memory", title: "Memory", desc: "Memory metrics", icon: Database, cls: "bg-accent/20 text-accent" },
  { id: "disk", title: "Disk", desc: "Disk & I/O metrics", icon: HardDrive, cls: "bg-warning/20 text-warning" },
  { id: "hardware", title: "Hardware", desc: "Hardware health", icon: CircuitBoard, cls: "bg-primary/20 text-primary" },
  { id: "network", title: "Network", desc: "Network metrics", icon: Network, cls: "bg-accent/20 text-accent" },
  { id: "process", title: "Process", desc: "Process metrics", icon: Activity, cls: "bg-warning/20 text-warning" },
  { id: "service", title: "Service", desc: "Service status", icon: Server, cls: "bg-primary/20 text-primary" },
  { id: "logs", title: "Logs", desc: "Log patterns", icon: ScrollText, cls: "bg-muted text-muted-foreground" },
  { id: "ebpf", title: "eBPF / Kernel", desc: "Kernel events", icon: Layers, cls: "bg-accent/20 text-accent" },
  { id: "custom", title: "Custom Metric", desc: "External/Custom metrics", icon: Settings, cls: "bg-muted text-muted-foreground" },
]
const ACTION_TYPES = [
  { id: "restart-service", title: "Restart Service", desc: "Restart a system service managed by the system.", bg: "bg-emerald-700", icon: RefreshCw },
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

function Toggle({ checked, onChange }) {
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors", checked ? "bg-primary" : "bg-secondary")}>
      <span className={cn("pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
    </button>
  )
}
function TagPill({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-secondary/70 border border-border px-2 py-0.5 font-mono text-[11px] text-foreground">
      {label}<button onClick={onRemove} className="text-muted-foreground hover:text-foreground cursor-pointer ml-0.5"><X className="size-2.5" /></button>
    </span>
  )
}
function Radio({ checked }) {
  return (
    <div className={cn("size-4 rounded-full border-2 flex items-center justify-center shrink-0", checked ? "border-primary" : "border-muted-foreground/50")}>
      {checked && <div className="size-2 rounded-full bg-primary" />}
    </div>
  )
}
function Checkbox({ checked, onClick }) {
  return (
    <div onClick={onClick} className={cn("size-4 rounded border flex items-center justify-center cursor-pointer transition-colors shrink-0", checked ? "bg-primary border-primary" : "border-border bg-card")}>
      {checked && <Check className="size-2.5 text-primary-foreground" />}
    </div>
  )
}
function SelectBox({ value, options, onChange, className }) {
  return (
    <div className={cn("relative", className)}>
      <select value={value} onChange={e => onChange && onChange(e.target.value)}
        className="w-full appearance-none rounded-md border border-border bg-card px-3 pr-8 py-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none cursor-pointer">
        {options.map(o => <option key={o} className="bg-card">{o}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
    </div>
  )
}
function WizardProgress({ current }) {
  return (
    <div className="flex items-center justify-between py-8 px-2 overflow-x-auto relative mb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {STEP_DEFS.map((s, i) => {
        const done = s.num < current
        const active = s.num === current
        return (
          <React.Fragment key={s.num}>
            <div className="flex flex-col items-center gap-2 relative z-10 shrink-0">
              <div className={cn("flex size-8 items-center justify-center rounded-full border text-xs font-bold transition-all",
                active ? "border-primary bg-primary text-primary-foreground shadow-glow-primary" : 
                done ? "border-primary/50 bg-primary/10 text-primary" : 
                "border-border bg-card text-muted-foreground"
              )}>
                {s.num}
              </div>
              <span className={cn("font-mono text-[10px] whitespace-nowrap absolute -bottom-6", 
                active ? "text-primary font-bold" : done ? "text-foreground" : "text-muted-foreground"
              )}>
                {s.label}
              </span>
            </div>
            {i < STEP_DEFS.length - 1 && (
              <div className={cn("flex-1 h-px min-w-[20px] -mt-5 transition-colors", 
                done ? "bg-primary/50" : "bg-border"
              )} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function StepNav({ current, onBack, onNext, nextLabel = "Next" }) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <button onClick={onBack} className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-5 font-mono text-xs text-foreground hover:bg-secondary transition-colors cursor-pointer">
        <ArrowLeft className="size-3.5" /> Back
      </button>
      <div className="flex items-center gap-0.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {STEP_DEFS.map((s, i) => {
          const done = s.num < current; const active = s.num === current
          return (
            <React.Fragment key={s.num}>
              {i > 0 && <div className={cn("h-px w-3 shrink-0", done ? "bg-primary/60" : "bg-border")} />}
              <div className={cn("flex size-6 items-center justify-center rounded-full border font-mono text-[10px] font-bold shrink-0",
                active ? "border-primary bg-primary text-primary-foreground" : done ? "border-primary/60 bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground")}>
                {done ? <Check className="size-3" /> : s.num}
              </div>
            </React.Fragment>
          )
        })}
      </div>
      <button onClick={onNext} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-5 font-mono text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-glow-primary transition-colors cursor-pointer">
        {nextLabel} <ArrowRight className="size-3.5" />
      </button>
    </div>
  )
}

const SUMMARY_ITEMS = [
  { label: "Monitored Source", value: "Not selected", icon: CheckCircle, ic: "text-primary/50", vc: "text-muted-foreground" },
  { label: "Target", value: "Not selected", icon: CheckCircle, ic: "text-primary/50", vc: "text-muted-foreground" },
  { label: "Condition", value: "Not configured", icon: Activity, ic: "text-warning/60", vc: "text-muted-foreground" },
  { label: "Action", value: "Not configured", icon: CheckCircle, ic: "text-primary/50", vc: "text-muted-foreground" },
  { label: "Verification", value: "Not configured", icon: CheckCircle, ic: "text-primary/50", vc: "text-muted-foreground" },
  { label: "Auto-Healing", value: "Not configured", icon: AlertTriangle, ic: "text-warning", vc: "text-muted-foreground" },
  { label: "Status", value: "● Enabled", icon: CheckCircle, ic: "text-primary/50", vc: "text-primary" },
]

function Step1({ form, setForm, onNext, onCancel }) {
  const addTag = v => { const t = v.trim().toLowerCase(); if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] })); setForm(f => ({ ...f, tagInput: "" })) }
  const removeTag = t => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))
  const PMAP = { Critical: "bg-destructive", High: "bg-destructive", Medium: "bg-accent", Low: "bg-muted-foreground" }
  return (
    <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0">
        <Panel className="p-6">
          <div className="mb-6"><p className="font-mono text-[14px] uppercase tracking-widest text-primary font-bold">1. BASIC INFORMATION</p><p className="text-[13px] text-muted-foreground mt-1">Define the basic details for your rule.</p></div>
          <div className="space-y-6">
            <div>
              <label className="block font-mono text-[12px] text-muted-foreground mb-2">Rule Name <span className="text-destructive">*</span></label>
              <input type="text" value={form.ruleName} maxLength={100} onChange={e => setForm(f => ({ ...f, ruleName: e.target.value }))}
                className="w-full rounded-md border border-white/5 bg-[#090e11] px-3 py-2.5 font-mono text-[13px] text-foreground focus:border-primary/50 focus:outline-none" placeholder="e.g. High Host CPU" />
              <div className="flex justify-between mt-1.5">
                <span className="font-mono text-[11px] text-muted-foreground">A human-readable name for this rule.</span>
                <span className="font-mono text-[11px] text-muted-foreground">{form.ruleName.length} / 100</span>
              </div>
            </div>
            <div>
              <label className="block font-mono text-[12px] text-muted-foreground mb-2">Description</label>
              <textarea value={form.description} maxLength={255} rows={3} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full resize-none rounded-md border border-white/5 bg-[#090e11] px-3 py-2.5 font-mono text-[13px] text-foreground focus:border-primary/50 focus:outline-none" />
              <div className="flex justify-end mt-1.5"><span className="font-mono text-[11px] text-muted-foreground">{form.description.length} / 255</span></div>
            </div>
            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className="block font-mono text-[12px] text-muted-foreground mb-2">Status</label>
                <div className="flex items-center gap-3 rounded-md border border-white/5 bg-[#090e11] px-3 h-[42px]">
                  <Toggle checked={form.enabled} onChange={v => setForm(f => ({ ...f, enabled: v }))} />
                  <span className="font-mono text-[13px] text-foreground">{form.enabled ? "Enabled" : "Disabled"}</span>
                </div>
                <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">Enable or disable this rule.</p>
              </div>
              <div>
                <label className="block font-mono text-[12px] text-muted-foreground mb-2">Priority <span className="text-destructive">*</span></label>
                <div className="relative">
                  <span className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 inline-block size-2 rounded-full", PMAP[form.priority] || "bg-muted-foreground")} />
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full appearance-none rounded-md border border-white/5 bg-[#090e11] pl-8 pr-8 py-2.5 font-mono text-[13px] text-foreground focus:border-primary/50 focus:outline-none cursor-pointer h-[42px]">
                    {["Critical","High","Medium","Low"].map(p => <option key={p} className="bg-card">{p}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
                <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">Select the rule priority.</p>
              </div>
              <div>
                <label className="block font-mono text-[12px] text-muted-foreground mb-2">Rule Owner <span className="text-destructive">*</span></label>
                <div className="relative">
                  <select value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                    className="w-full appearance-none rounded-md border border-white/5 bg-[#090e11] px-3 pr-8 py-2.5 font-mono text-[13px] text-foreground focus:border-primary/50 focus:outline-none cursor-pointer h-[42px]">
                    {["Admin","DevOps","SRE Team","Security"].map(o => <option key={o} className="bg-card">{o}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
                <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">Who owns this rule.</p>
              </div>
            </div>
            <div>
              <label className="block font-mono text-[12px] text-muted-foreground mb-2">Tags (Optional)</label>
              <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-white/5 bg-[#090e11] px-3 py-2 min-h-[42px]">
                {form.tags.map(t => <TagPill key={t} label={t} onRemove={() => removeTag(t)} />)}
                <input value={form.tagInput} onChange={e => setForm(f => ({ ...f, tagInput: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(form.tagInput) } }}
                  onBlur={() => { if (form.tagInput.trim()) addTag(form.tagInput) }}
                  placeholder="" className="flex-1 min-w-[80px] bg-transparent font-mono text-[13px] text-foreground focus:outline-none" />
                <ChevronDown className="ml-auto size-4 text-muted-foreground shrink-0" />
              </div>
              <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">Add tags to categorize this rule.</p>
            </div>
          </div>
          <div className="mt-8 flex items-center justify-between">
            <button onClick={onCancel} className="h-10 rounded-md border border-border bg-transparent px-6 font-mono text-[13px] text-foreground hover:bg-white/5 transition-colors cursor-pointer">Cancel</button>
            <button onClick={onNext} className="inline-flex h-10 items-center gap-2 rounded-md border border-primary bg-transparent px-6 font-mono text-[13px] text-primary hover:bg-primary/10 transition-colors cursor-pointer">Next <ArrowRight className="size-4" /></button>
          </div>
        </Panel>
      </div>
      <div className="w-[280px] shrink-0">
        <Panel className="p-5">
          <p className="mb-5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">RULE SUMMARY (PREVIEW)</p>
          <div className="space-y-4">
            {SUMMARY_ITEMS.map(item => { const Icon = item.icon; return (
              <div key={item.label} className="flex items-start gap-3">
                <Icon className={cn("size-4 mt-0.5 shrink-0", item.ic)} />
                <div><p className="font-mono text-[12px] font-medium text-foreground leading-tight">{item.label}</p><p className={cn("font-mono text-[11px] leading-tight mt-1", item.vc)}>{item.value}</p></div>
              </div>
            )})}
          </div>
          <div className="mt-6 flex gap-3 rounded-md border border-transparent bg-[#090e11] p-4">
            <BarChart3 className="size-5 text-cyan-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-500 mb-1">ESTIMATED IMPACT</p>
              <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">This rule will impact 0 hosts<br/>and monitor 0 resources</p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Step2({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">2. Scope (Target / Where)</p><p className="text-xs text-muted-foreground mt-0.5">Where should this rule apply?</p></div>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block font-mono text-[11px] text-foreground mb-1.5">Environment <span className="text-destructive">*</span></label><SelectBox value={form.environment} options={["Production","Staging","Development"]} onChange={v => setForm(f => ({ ...f, environment: v }))} /></div>
          <div><label className="block font-mono text-[11px] text-foreground mb-1.5">Region <span className="text-destructive">*</span></label><SelectBox value={form.region} options={["US-East-1","EU-Central-1","AP-Southeast-1"]} onChange={v => setForm(f => ({ ...f, region: v }))} /></div>
        </div>
        <div>
          <label className="block font-mono text-[11px] text-foreground mb-3">Apply To</label>
          <div className="grid grid-cols-3 gap-3">
            {[{ id:"all-hosts",label:"All hosts in environment",desc:"Apply rule to all hosts" },{ id:"host-groups",label:"Host groups",desc:"Select one or more groups" },{ id:"specific-hosts",label:"Specific hosts",desc:"Select individual hosts" }].map(opt => (
              <label key={opt.id} onClick={() => setForm(f => ({ ...f, applyTo: opt.id }))}
                className={cn("flex flex-col gap-1.5 rounded-md border p-3 cursor-pointer transition-colors", form.applyTo === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
                <div className="flex items-center justify-between"><span className="font-mono text-xs font-semibold text-foreground">{opt.label}</span><Radio checked={form.applyTo === opt.id} /></div>
                <p className="font-mono text-[10px] text-muted-foreground">{opt.desc}</p>
              </label>
            ))}
          </div>
        </div>
        {form.applyTo === "host-groups" && (
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Host Groups <span className="text-destructive">*</span></label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 min-h-[42px]">
              {form.hostGroups.map(g => (
                <span key={g} className="inline-flex items-center gap-1 rounded bg-secondary/70 border border-border px-2 py-0.5 font-mono text-[11px] text-foreground">
                  {g}<button onClick={() => setForm(f => ({ ...f, hostGroups: f.hostGroups.filter(x => x !== g) }))} className="text-muted-foreground hover:text-foreground cursor-pointer ml-0.5"><X className="size-2.5" /></button>
                </span>
              ))}
              <ChevronDown className="ml-auto size-3.5 text-muted-foreground shrink-0" />
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}

function Step3({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">3. Monitor (Data Source)</p><p className="text-xs text-muted-foreground mt-0.5">What do you want to monitor?</p></div>
      <div className="grid grid-cols-2 gap-3">
        {MONITOR_SOURCES.map(src => { const Icon = src.icon; const sel = form.monitorSource === src.id; return (
          <label key={src.id} onClick={() => setForm(f => ({ ...f, monitorSource: src.id }))}
            className={cn("flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors", sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
            <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", src.cls)}><Icon className="size-4" /></div>
            <div className="flex-1 min-w-0"><p className="font-mono text-xs font-semibold text-foreground">{src.title}</p><p className="font-mono text-[10px] text-muted-foreground">{src.desc}</p></div>
            <Radio checked={sel} />
          </label>
        )})}
      </div>
    </Panel>
  )
}

function Step4({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">4. Target & Metric</p><p className="text-xs text-muted-foreground mt-0.5">Select the metric and target for this rule.</p></div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <div><label className="block font-mono text-[11px] text-foreground mb-1.5">Metric <span className="text-destructive">*</span></label><SelectBox value={form.metric} options={["CPU Usage","Memory Usage","Disk I/O","Network Throughput","Load Average"]} onChange={v => setForm(f => ({ ...f, metric: v }))} /></div>
          <div><label className="block font-mono text-[11px] text-foreground mb-1.5">Target Type <span className="text-destructive">*</span></label><SelectBox value={form.targetType} options={["Host","Container","Service","Cluster"]} onChange={v => setForm(f => ({ ...f, targetType: v }))} /></div>
          <div><label className="block font-mono text-[11px] text-foreground mb-1.5">Host <span className="text-destructive">*</span></label><SelectBox value={form.host} options={["web-01.prod.local","web-02.prod.local","app-01.prod.local"]} onChange={v => setForm(f => ({ ...f, host: v }))} /></div>
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Aggregation <span className="text-destructive">*</span></label>
            <SelectBox value={form.aggregation} options={["Average (Avg)","Maximum (Max)","Minimum (Min)","Sum","Count"]} onChange={v => setForm(f => ({ ...f, aggregation: v }))} />
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">How values are aggregated for evaluation.</p>
          </div>
        </div>
        <div className="col-span-1">
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4 h-full">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary mb-2">About CPU Usage</p>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">CPU Usage measures the total CPU utilization percentage on the selected host.</p>
            <p className="mt-3 font-mono text-[10px] text-muted-foreground leading-relaxed">How values are aggregated for evaluation.</p>
          </div>
        </div>
      </div>
    </Panel>
  )
}

function Step5({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">5. Conditions (When)</p><p className="text-xs text-muted-foreground mt-0.5">Define when this rule should trigger.</p></div>
      <div className="space-y-5">
        <div>
          <label className="block font-mono text-[11px] text-foreground mb-2">Metric · Operator · Threshold</label>
          <div className="flex items-center gap-2 flex-wrap">
            <SelectBox value={form.condMetric} options={["CPU Usage (%)","Memory Usage (%)","Disk Usage (%)"]} onChange={v => setForm(f => ({ ...f, condMetric: v }))} className="flex-1 min-w-[140px]" />
            <SelectBox value={form.condOperator} options={["Greater Than (>)","Less Than (<)","Equals (=)"]} onChange={v => setForm(f => ({ ...f, condOperator: v }))} className="w-44" />
            <input type="number" value={form.condThreshold} onChange={e => setForm(f => ({ ...f, condThreshold: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
            <span className="font-mono text-xs text-muted-foreground">%</span>
          </div>
        </div>
        <div>
          <label className="block font-mono text-[11px] text-foreground mb-1.5">Duration (How long must persist)</label>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="number" value={form.condDuration} onChange={e => setForm(f => ({ ...f, condDuration: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
            <SelectBox value="Minutes" options={["Seconds","Minutes","Hours"]} onChange={() => {}} className="w-28" />
            <SelectBox value={form.condInterval} options={["Every 30 seconds","Every 1 minute","Every 5 minutes"]} onChange={v => setForm(f => ({ ...f, condInterval: v }))} className="w-40" />
          </div>
        </div>
        <div>
          <label className="block font-mono text-[11px] text-foreground mb-1.5">Required Occurrences (within the window)</label>
          <div className="flex items-center gap-2">
            <input type="number" value={form.condOccurrences} onChange={e => setForm(f => ({ ...f, condOccurrences: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
            <span className="font-mono text-xs text-muted-foreground">out of</span>
            <input type="number" value={form.condOutOf} onChange={e => setForm(f => ({ ...f, condOutOf: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
          </div>
        </div>
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary mb-1 font-bold">Condition Preview</p>
          <p className="font-mono text-xs text-foreground">CPU Usage &gt; {form.condThreshold}% for {form.condDuration} minutes</p>
        </div>
      </div>
    </Panel>
  )
}

function Step6({ form, setForm }) {
  const sevs = [
    { id:"warning",label:"Warning",emoji:"⚠️",desc:"Needs attention",note:"Recommended for non-urgent issues.",ab:"border-warning",bb:"border-warning/40",abg:"bg-warning/10",bbg:"bg-warning/5",tc:"text-warning" },
    { id:"high",label:"High",emoji:"🔴",desc:"Affects system performance.",note:"Impacts system performance.",ab:"border-destructive",bb:"border-destructive/40",abg:"bg-destructive/10",bbg:"bg-destructive/5",tc:"text-destructive" },
    { id:"critical",label:"Critical",emoji:"💥",desc:"Service impact / Down.",note:"May cause service interruption.",ab:"border-red-400",bb:"border-red-400/40",abg:"bg-red-900/20",bbg:"bg-red-900/10",tc:"text-red-400" },
  ]
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">6. Severity</p><p className="text-xs text-muted-foreground mt-0.5">How severe is this condition?</p></div>
      <div className="grid grid-cols-3 gap-4">
        {sevs.map(s => (
          <label key={s.id} onClick={() => setForm(f => ({ ...f, severity: s.id }))}
            className={cn("flex flex-col rounded-lg border-2 p-4 cursor-pointer transition-all", form.severity === s.id ? s.ab+" "+s.abg : s.bb+" "+s.bbg)}>
            <div className="flex items-center justify-between mb-3"><span className="text-2xl">{s.emoji}</span><Radio checked={form.severity === s.id} /></div>
            <p className={cn("font-mono text-sm font-bold", s.tc)}>{s.label}</p>
            <p className="font-mono text-[11px] text-foreground mt-1">{s.desc}</p>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">{s.note}</p>
          </label>
        ))}
      </div>
      <div className="mt-5 rounded-md border border-border bg-secondary/10 p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-bold">Impact Preview</p>
        <p className="font-mono text-xs text-muted-foreground">This severity will create an incident and notify the appropriate teams.</p>
      </div>
    </Panel>
  )
}

function Step7({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-5"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">7. Actions (What to Do)</p><p className="text-xs text-muted-foreground mt-0.5">Select the action type to perform when the condition is triggered.</p></div>
      <p className="font-mono text-[11px] text-foreground mb-3">Action Type <span className="text-destructive">*</span></p>
      <div className="grid grid-cols-3 gap-3">
        {ACTION_TYPES.map(a => { const Icon = a.icon; const sel = form.actionType === a.id; return (
          <label key={a.id} onClick={() => setForm(f => ({ ...f, actionType: a.id }))}
            className={cn("flex items-center gap-3 rounded-md border p-3.5 cursor-pointer transition-all", sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
            <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", a.bg)}><Icon className="size-4 text-white" /></div>
            <div className="flex-1 min-w-0"><p className="font-mono text-xs font-semibold text-foreground leading-tight">{a.title}</p><p className="font-mono text-[10px] text-muted-foreground leading-tight mt-0.5">{a.desc}</p></div>
            <Radio checked={sel} />
          </label>
        )})}
      </div>
      <div className="mt-5 flex gap-2 rounded-md border border-accent/20 bg-accent/5 p-3">
        <Info className="size-4 text-accent shrink-0 mt-0.5" />
        <div>
          <p className="font-mono text-[11px] text-foreground">Note: Target selection (service, process, host, etc.) is handled by the respective domain owner.</p>
          <p className="font-mono text-[11px] text-accent mt-0.5">This policy only defines the action type.</p>
        </div>
      </div>
    </Panel>
  )
}

function Step8({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">8. Safety (Approval & Permissions)</p><p className="text-xs text-muted-foreground mt-0.5">Control how and when this action can be executed.</p></div>
      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-md border border-border bg-secondary/10 p-4">
          <div><p className="font-mono text-xs font-semibold text-foreground">Automatic Execution</p><p className="font-mono text-[11px] text-muted-foreground mt-0.5">Allow the system to execute this action automatically.</p></div>
          <div className="flex items-center gap-2 shrink-0 ml-4"><Toggle checked={form.autoExec} onChange={v => setForm(f => ({ ...f, autoExec: v }))} /><span className="font-mono text-xs text-foreground">{form.autoExec ? "Enabled" : "Disabled"}</span></div>
        </div>
        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-3">Approval Required</p>
          <div className="grid grid-cols-3 gap-3">
            {[{ id:"never",label:"Never",desc:"Execute without approval" },{ id:"high-critical",label:"For High / Critical",desc:"Requires approval for High or Critical severity" },{ id:"always",label:"Always",desc:"Always require approval before execution" }].map(opt => (
              <label key={opt.id} onClick={() => setForm(f => ({ ...f, approvalRequired: opt.id }))}
                className={cn("flex flex-col gap-1.5 rounded-md border p-3 cursor-pointer transition-colors", form.approvalRequired === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
                <div className="flex items-center justify-between"><p className="font-mono text-xs font-semibold text-foreground">{opt.label}</p><Radio checked={form.approvalRequired === opt.id} /></div>
                <p className="font-mono text-[10px] text-muted-foreground">{opt.desc}</p>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-3">Allowed During</p>
          <div className="grid grid-cols-2 gap-3">
            {[{ id:"always",label:"Always",desc:"Actions can run 24/7" },{ id:"maintenance-only",label:"Maintenance Windows Only",desc:"Restrict actions to maintenance windows" }].map(opt => (
              <label key={opt.id} onClick={() => setForm(f => ({ ...f, allowedDuring: opt.id }))}
                className={cn("flex flex-col gap-1.5 rounded-md border p-3 cursor-pointer transition-colors", form.allowedDuring === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
                <div className="flex items-center justify-between"><p className="font-mono text-xs font-semibold text-foreground">{opt.label}</p><Radio checked={form.allowedDuring === opt.id} /></div>
                <p className="font-mono text-[10px] text-muted-foreground">{opt.desc}</p>
              </label>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}

function Step9({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">9. Retry & Cooldown</p><p className="text-xs text-muted-foreground mt-0.5">Configure recovery and cooldown behavior.</p></div>
      <div className="space-y-5">
        <div className="flex gap-2 rounded-md border border-primary/20 bg-primary/5 p-3"><Info className="size-4 text-primary shrink-0 mt-0.5" /><p className="font-mono text-[11px] text-foreground">Retry is not applicable for Alert-only actions.</p></div>
        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-3">Cooldown</p>
          <div className="space-y-3">
            <div>
              <label className="block font-mono text-[11px] text-foreground mb-1.5">Cooldown Period</label>
              <div className="flex items-center gap-2">
                <input type="number" value={form.cooldownPeriod} onChange={e => setForm(f => ({ ...f, cooldownPeriod: e.target.value }))}
                  className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
                <SelectBox value="Minutes" options={["Minutes","Hours"]} onChange={() => {}} className="w-28" />
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">Prevent duplicate incidents within this period.</p>
            </div>
            <div className="space-y-2 pt-1">
              {[{ key:"suppressDups", label:"Suppress duplicate incidents during cooldown" },{ key:"enableDedup", label:"Enable deduplication during cooldown" }].map(opt => (
                <label key={opt.key} className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox checked={form[opt.key]} onClick={() => setForm(f => ({ ...f, [opt.key]: !f[opt.key] }))} />
                  <span className="font-mono text-xs text-foreground">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}

function Step10({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">10. Verification & Recovery</p><p className="text-xs text-muted-foreground mt-0.5">How recovery is detected for this rule.</p></div>
      <div className="space-y-5">
        <div className="flex gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
          <Info className="size-4 text-primary shrink-0 mt-0.5" />
          <p className="font-mono text-[11px] text-foreground">Verification is not required for Alert-only actions.<br />Set recovery condition to auto-resolve incidents.</p>
        </div>
        <div>
          <label className="block font-mono text-xs font-semibold text-foreground mb-2">Recovery Condition</label>
          <div className="flex items-center gap-2 flex-wrap">
            <SelectBox value="CPU Usage (%)" options={["CPU Usage (%)","Memory Usage (%)"]} onChange={() => {}} className="flex-1 min-w-[140px]" />
            <SelectBox value="Less Than (<)" options={["Less Than (<)","Greater Than (>)"]} onChange={() => {}} className="w-36" />
            <input type="number" value={form.recoveryThreshold} onChange={e => setForm(f => ({ ...f, recoveryThreshold: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
            <span className="font-mono text-xs text-muted-foreground">%</span>
          </div>
        </div>
        <div>
          <label className="block font-mono text-xs font-semibold text-foreground mb-2">Duration</label>
          <div className="flex items-center gap-2">
            <input type="number" value={form.recoveryDuration} onChange={e => setForm(f => ({ ...f, recoveryDuration: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
            <SelectBox value="Minutes" options={["Seconds","Minutes"]} onChange={() => {}} className="w-28" />
          </div>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">Condition must be true for the duration to be marked as recovered.</p>
        </div>
      </div>
    </Panel>
  )
}

function Step11({ form, setForm }) {
  const EVENTS = ["Incident detected","Condition recovered","Remediation started","Remediation successful","Remediation failed","Approval required","Max retries reached"]
  const CHANNELS = [{ id:"email",label:"Email",icon:Mail },{ id:"slack",label:"Slack",icon:MessageSquare },{ id:"teams",label:"Teams",icon:Users },{ id:"servicenow",label:"ServiceNow",icon:Settings },{ id:"webhook",label:"Webhook",icon:Link2 }]
  const toggle = (arr, key, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">11. Notifications</p><p className="text-xs text-muted-foreground mt-0.5">When and how should users be notified?</p></div>
      <div className="space-y-6">
        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-3">Notify When</p>
          <div className="grid grid-cols-2 gap-2">
            {EVENTS.map(ev => (
              <label key={ev} className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox checked={form.notifyEvents.includes(ev)} onClick={() => setForm(f => ({ ...f, notifyEvents: toggle(f.notifyEvents,"notifyEvents",ev) }))} />
                <span className="font-mono text-xs text-foreground">{ev}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-3">Notification Channels</p>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map(ch => { const Icon = ch.icon; const active = form.notifyChannels.includes(ch.id); return (
              <button key={ch.id} onClick={() => setForm(f => ({ ...f, notifyChannels: toggle(f.notifyChannels,"notifyChannels",ch.id) }))}
                className={cn("inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-xs transition-colors cursor-pointer", active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
                <Icon className="size-3.5" />{ch.label}
              </button>
            )})}
          </div>
        </div>
        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-2">Recipients</p>
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 min-h-[42px]">
            {form.notifyRecipients.map(r => (
              <span key={r} className="inline-flex items-center gap-1 rounded bg-secondary/70 border border-border px-2 py-0.5 font-mono text-[11px] text-foreground">
                {r}<button onClick={() => setForm(f => ({ ...f, notifyRecipients: f.notifyRecipients.filter(x => x !== r) }))} className="text-muted-foreground hover:text-foreground cursor-pointer ml-0.5"><X className="size-2.5" /></button>
              </span>
            ))}
            <input placeholder="Add email…" className="flex-1 min-w-[120px] bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); const v = e.target.value.trim(); if (v && !form.notifyRecipients.includes(v)) setForm(f => ({ ...f, notifyRecipients: [...f.notifyRecipients, v] })); e.target.value = "" }}} />
            <button className="ml-auto flex items-center gap-1 rounded border border-primary/30 px-2 py-0.5 font-mono text-[11px] text-primary hover:bg-primary/10 cursor-pointer"><Plus className="size-3" /> Add</button>
          </div>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">Separate multiple emails with commas</p>
        </div>
      </div>
    </Panel>
  )
}

function Step12({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">12. Schedule</p><p className="text-xs text-muted-foreground mt-0.5">When should this rule be active?</p></div>
      <div className="space-y-6">
        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-3">Activation</p>
          <div className="grid grid-cols-2 gap-3">
            {[{ id:"always",label:"Always Active",desc:"Runs rule 24/7 without interruption." },{ id:"custom",label:"Custom Schedule",desc:"Set specific days and times." }].map(opt => (
              <label key={opt.id} onClick={() => setForm(f => ({ ...f, schedule: opt.id }))}
                className={cn("flex flex-col gap-1.5 rounded-md border p-4 cursor-pointer transition-colors", form.schedule === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
                <div className="flex items-center justify-between"><p className="font-mono text-xs font-semibold text-foreground">{opt.label}</p><Radio checked={form.schedule === opt.id} /></div>
                <p className="font-mono text-[10px] text-muted-foreground">{opt.desc}</p>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-3">Maintenance Mode</p>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox checked={form.suppressMaintenance} onClick={() => setForm(f => ({ ...f, suppressMaintenance: !f.suppressMaintenance }))} />
            <span className="font-mono text-xs text-foreground">Suppress alerts during maintenance windows</span>
          </label>
        </div>
        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-2">Timezone</p>
          <div className="relative">
            <Globe className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <select className="w-full appearance-none rounded-md border border-border bg-card pl-9 pr-8 py-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none cursor-pointer">
              <option>(UTC) Coordinated Universal Time</option>
              <option>(UTC+5:30) India Standard Time</option>
              <option>(UTC-5:00) Eastern Standard Time</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </Panel>
  )
}

function Step13({ form, onCancel }) {
  const [created, setCreated] = useState(false)
  if (created) return (
    <Panel className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="relative">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/20 shadow-glow-primary animate-pulse"><Check className="size-10 text-primary" /></div>
        <div className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"><Star className="size-3" /></div>
      </div>
      <div><h2 className="text-2xl font-bold text-foreground mb-2">Rule Created Successfully!</h2><p className="text-sm text-muted-foreground">Your rule has been created and is now active.</p></div>
      <div className="rounded-lg border border-border bg-card/50 p-4 text-left w-full max-w-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs">
          <span className="text-muted-foreground">Rule Name</span><span className="text-foreground font-semibold">{form.ruleName}</span>
          <span className="text-muted-foreground">Rule ID</span><span className="text-primary">RULE-2026-08-18-001</span>
          <span className="text-muted-foreground">Status</span><span className="text-primary">Active</span>
          <span className="text-muted-foreground">Created At</span><span className="text-foreground">Aug 18, 2026 10:23:57 AM</span>
        </div>
      </div>
      <div className="flex gap-3">
        <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-5 font-mono text-xs text-foreground hover:bg-secondary transition-colors cursor-pointer">View Rule Details</button>
        <button onClick={() => { setCreated(false); onCancel() }} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 font-mono text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-glow-primary transition-colors cursor-pointer"><Plus className="size-3.5" /> Create Another Rule</button>
      </div>
    </Panel>
  )
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-1">
        <Panel className="p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">Review Checklist</p>
          <div className="space-y-2">
            {["Basic Information","Scope (Where)","Monitor (Data Source)","Target & Metric","Conditions (When)","Severity","Actions (What to Do)","Safety & Approvals","Retry & Cooldown","Verification & Recovery","Notifications","Schedule"].map(item => (
              <div key={item} className="flex items-center gap-2"><CheckCircle className="size-3.5 text-primary shrink-0" /><span className="font-mono text-[11px] text-foreground">{item}</span></div>
            ))}
          </div>
        </Panel>
      </div>
      <div className="col-span-2 space-y-4">
        <Panel className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">Rule Summary</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div><p className="font-mono text-[10px] text-muted-foreground">Rule Name</p><p className="font-mono text-xs text-foreground font-semibold">{form.ruleName}</p></div>
            <div><p className="font-mono text-[10px] text-muted-foreground">Status</p><p className="font-mono text-xs text-primary font-semibold">● {form.enabled ? "Enabled" : "Disabled"}</p></div>
            <div><p className="font-mono text-[10px] text-muted-foreground">Priority</p><p className="font-mono text-xs text-warning font-semibold">● {form.priority}</p></div>
            <div><p className="font-mono text-[10px] text-muted-foreground">Description</p><p className="font-mono text-xs text-foreground leading-relaxed">{form.description || "Not provided"}</p></div>
          </div>
        </Panel>
        <div className="grid grid-cols-2 gap-4">
          <Panel className="p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Scope</p>
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex gap-2"><span className="text-muted-foreground w-14 shrink-0">Env:</span><span className="text-foreground">{form.environment}</span></div>
              <div className="flex gap-2"><span className="text-muted-foreground w-14 shrink-0">Region:</span><span className="text-foreground">{form.region}</span></div>
              <div className="flex gap-2"><span className="text-muted-foreground w-14 shrink-0">Groups:</span><span className="text-foreground">{form.hostGroups.join(", ")}</span></div>
            </div>
          </Panel>
          <Panel className="p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Monitor & Target</p>
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex gap-2"><span className="text-muted-foreground w-14 shrink-0">Metric:</span><span className="text-foreground">{form.metric}</span></div>
              <div className="flex gap-2"><span className="text-muted-foreground w-14 shrink-0">Target:</span><span className="text-foreground">{form.host}</span></div>
              <div className="flex gap-2"><span className="text-muted-foreground w-14 shrink-0">Aggr:</span><span className="text-foreground">{form.aggregation}</span></div>
            </div>
          </Panel>
        </div>
        <Panel className="p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Rule Logic</p>
          <p className="font-mono text-xs text-foreground leading-relaxed">
            When CPU Usage on <span className="text-primary">{form.host}</span> remains above {form.condThreshold}% for {form.condDuration} minutes, create a <span className="text-warning">{form.severity}</span> severity incident and notify <span className="text-primary">{form.notifyRecipients[0] || "configured operators"}</span>.
          </p>
        </Panel>
        <div className="flex justify-end">
          <button onClick={() => setCreated(true)} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-6 font-mono text-xs font-bold tracking-wide text-primary-foreground hover:bg-primary/90 shadow-glow-primary transition-colors cursor-pointer">
            Create Rule <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

const INITIAL_FORM = {
  ruleName: "High Host CPU", description: "Detect sustained CPU pressure on production hosts\nand create an alert.",
  enabled: true, priority: "High", owner: "Admin", tags: ["cpu","performance","auto-heal"], tagInput: "",
  environment: "Production", region: "US-East-1", applyTo: "host-groups", hostGroups: ["Web Servers","App Servers"],
  monitorSource: "cpu", metric: "CPU Usage", targetType: "Host", host: "web-01.prod.local", aggregation: "Average (Avg)",
  condMetric: "CPU Usage (%)", condOperator: "Greater Than (>)", condThreshold: "90", condDuration: "5", condInterval: "Every 30 seconds", condOccurrences: "3", condOutOf: "5",
  severity: "high", actionType: "create-incident",
  autoExec: true, approvalRequired: "high-critical", allowedDuring: "always",
  cooldownPeriod: "10", suppressDups: false, enableDedup: false,
  recoveryThreshold: "80", recoveryDuration: "2",
  notifyEvents: ["Incident detected","Condition recovered","Remediation started","Remediation successful"],
  notifyChannels: ["email"], notifyRecipients: ["ops-team@company.com"],
  schedule: "always", suppressMaintenance: false,
}

export default function PolicyPage() {
  const [activeTab, setActiveTab] = useState("create-rule")
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL_FORM)

  const handleNext = () => setStep(s => Math.min(13, s + 1))
  const handleBack = () => { if (step === 1) setActiveTab("all-rules"); else setStep(s => Math.max(1, s - 1)) }
  const exitWizard = () => setActiveTab("all-rules")

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
      case 13: return <Step13 form={form} onCancel={exitWizard} />
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
        {STATS.map(s => (
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
            {t.badge != null && <span className="flex size-4 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">{t.badge}</span>}
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
      ) : (
        <Panel className="flex flex-col items-center justify-center gap-4 py-20">
          <Shield className="size-10 text-muted-foreground/30" />
          <p className="font-mono text-sm text-muted-foreground">{TABS.find(t => t.id === activeTab)?.label} — Click "Create New Rule" to get started</p>
          <button onClick={() => { setActiveTab("create-rule"); setStep(1); }} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary/10 border border-primary/20 px-4 font-mono text-xs text-primary hover:bg-primary/20 transition-colors cursor-pointer">
            <Plus className="size-3.5" /> Create New Rule
          </button>
        </Panel>
      )}
    </div>
  )
}

