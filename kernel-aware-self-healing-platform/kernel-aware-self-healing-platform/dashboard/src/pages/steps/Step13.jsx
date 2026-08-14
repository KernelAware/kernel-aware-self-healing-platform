import React, { useState } from "react"
import { Check, Star, Plus, ArrowRight, CheckCircle } from "lucide-react"
import { Panel } from "@/components/kit"

export default function Step13({ form, onCancel }) {
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
