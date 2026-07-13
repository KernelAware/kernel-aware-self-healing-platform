import React from 'react'
import { RotateCw, Download } from 'lucide-react'
import { Panel, PanelHeader, StatusBadge, ProgressBar, ActionButton } from '@/components/kit'

const heals = [
  { id: '#HEAL-8821', ts: 'Oct 24, 11:22:04', action: 'Restart PostgreSQL Service', comp: 'db-cluster-prod-01', rate: 100, status: 'Resolved', tone: 'success' },
  { id: '#HEAL-8819', ts: 'Oct 24, 09:45:12', action: 'Purge Docker Zombie Containers', comp: 'edge-worker-node-12', rate: 94, status: 'Resolved', tone: 'success' },
  { id: '#HEAL-8815', ts: 'Oct 23, 23:12:59', action: 'Kernel Memory Hard Flush', comp: 'core-api-v1-gw', rate: 25, status: 'Escalated', tone: 'danger' },
  { id: '#HEAL-8802', ts: 'Oct 23, 18:04:44', action: 'Scale Up Redis Replicas', comp: 'cache-fleet-us-east', rate: 100, status: 'Resolved', tone: 'success' },
]

export default function HealingHistoryTable() {
  return (
    <Panel className="mt-4">
      <PanelHeader title="Healing History" icon={RotateCw} action={<ActionButton icon={Download} className="h-8 cursor-pointer">Export CSV</ActionButton>} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-y border-border font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">Incident ID</th>
              <th className="px-4 py-2.5 text-left font-medium">Timestamp</th>
              <th className="px-4 py-2.5 text-left font-medium">Remediation Action</th>
              <th className="px-4 py-2.5 text-left font-medium">System Component</th>
              <th className="px-4 py-2.5 text-left font-medium">Success Rate</th>
              <th className="px-4 py-2.5 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {heals.map((h) => (
              <tr key={h.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                <td className="px-4 py-3 font-mono text-muted-foreground">{h.id}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{h.ts}</td>
                <td className="px-4 py-3 font-medium text-foreground">{h.action}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{h.comp}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={h.rate} tone={h.tone === 'danger' ? 'danger' : 'success'} className="w-24" />
                    <span className={h.tone === 'danger' ? 'text-destructive' : 'text-foreground'}>{h.rate}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right"><StatusBadge tone={h.tone}>{h.status}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
