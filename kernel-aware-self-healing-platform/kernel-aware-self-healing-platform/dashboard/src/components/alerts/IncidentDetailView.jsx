import React from 'react'
import { TriangleAlert, Sparkles, CircleCheck, Lightbulb } from 'lucide-react'
import { Panel, PanelHeader, StatusBadge } from '@/components/kit'

export default function IncidentDetailView({ timeline }) {
  return (
    <div className="flex flex-col gap-4 lg:col-span-2">
      <Panel>
        <PanelHeader 
          title="Incident Root Cause Analysis" 
          icon={TriangleAlert} 
          action={
            <div className="flex gap-2">
              <StatusBadge tone="success">Verified</StatusBadge>
              <StatusBadge tone="info">eBPF Telemetry</StatusBadge>
            </div>
          } 
        />
        <div className="p-4 pt-0">
          <p className="mb-4 font-mono text-[11px] text-muted-foreground">Trace: IX-9942 (Kernel Thread Staleness)</p>
          <ol className="relative flex flex-col gap-4 border-l border-border pl-6">
            {timeline.map((t, i) => (
              <li key={i} className="relative">
                <span className={`absolute -left-[27px] top-1 flex size-3 items-center justify-center rounded-full ring-4 ring-card ${t.tone === 'danger' ? 'bg-destructive' : t.tone === 'success' ? 'bg-primary' : 'bg-accent'}`} />
                <div className="flex items-center justify-between">
                  <span className={`font-mono text-xs ${t.tone === 'danger' ? 'text-destructive' : t.tone === 'success' ? 'text-primary' : 'text-accent'}`}>{t.time}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{t.label}</span>
                </div>
                <div className="mt-1.5 rounded-md border border-border bg-secondary/30 p-3">
                  <p className="font-mono text-xs text-foreground">{t.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground text-pretty">{t.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="AI Diagnostic Insight" icon={Sparkles} />
        <div className="p-4 pt-0">
          <p className="text-sm text-muted-foreground text-pretty">
            Analysis indicates a <span className="text-accent">Memory Leak Pattern</span> in the application layer core. This is not a hardware failure but a recurring issue when processing large JSON payloads (&gt;100MB) via the Node.js event loop. The system observed similar behavior 4 days ago.
          </p>
          <div className="mt-3 rounded-md border border-border bg-secondary/30 p-3">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Recommended Future Prevention</p>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-start gap-2">
                <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span className="text-foreground/80">Implement <span className="font-mono text-accent">--max-old-space-size=4096</span> on deployment templates.</span>
              </li>
              <li className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-warning" />
                <span className="text-foreground/80">Upgrade the <span className="font-mono text-accent">json-parser</span> library to version 2.4.0 (known fix for buffer leaks).</span>
              </li>
            </ul>
          </div>
        </div>
      </Panel>
    </div>
  )
}
