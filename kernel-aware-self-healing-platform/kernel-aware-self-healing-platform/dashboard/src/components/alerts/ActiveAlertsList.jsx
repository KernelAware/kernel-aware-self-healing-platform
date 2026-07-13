import React from 'react'
import { TriangleAlert } from 'lucide-react'
import { Panel, PanelHeader, StatusBadge } from '@/components/kit'

export default function ActiveAlertsList({ alerts, acknowledgeAlert, resolveAlert }) {
  return (
    <Panel>
      <PanelHeader 
        title="Active Alerts" 
        icon={TriangleAlert} 
        action={<StatusBadge tone="danger">{alerts.filter(a => a.tone === 'danger').length} Critical</StatusBadge>} 
      />
      <div className="flex flex-col gap-3 p-4 pt-0">
        {alerts.map((a) => (
          <div 
            key={a.id} 
            className={`rounded-md border p-3 ${
              a.tone === 'danger' 
                ? 'border-destructive/40 bg-destructive/5' 
                : a.tone === 'warning' 
                  ? 'border-warning/40 bg-warning/5' 
                  : 'border-border bg-secondary/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <StatusBadge tone={a.tone}>{a.level}</StatusBadge>
              <span className="font-mono text-[10px] text-muted-foreground">{a.age}</span>
            </div>
            <h4 className="mt-2 text-sm font-semibold">{a.title}</h4>
            <p className="mt-1 text-xs text-muted-foreground text-pretty">{a.body}</p>
            {a.acked ? (
              <div className="mt-3 rounded-md border border-border py-1.5 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground select-none">
                Acknowledged
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <button 
                  onClick={() => acknowledgeAlert(a.id)}
                  className={`flex-1 rounded-md py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider cursor-pointer ${
                    a.tone === 'danger' 
                      ? 'bg-destructive/80 text-destructive-foreground hover:bg-destructive' 
                      : 'bg-warning/80 text-warning-foreground hover:bg-warning'
                  }`}
                >
                  Acknowledge
                </button>
                <button 
                  onClick={() => resolveAlert(a.id)}
                  className="flex-1 rounded-md border border-border py-1.5 font-mono text-[11px] uppercase tracking-wider text-foreground hover:bg-secondary cursor-pointer"
                >
                  Resolve
                </button>
              </div>
            )}
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="text-center font-mono text-xs text-muted-foreground py-6">
            No active incidents detected.
          </div>
        )}
      </div>
    </Panel>
  )
}
