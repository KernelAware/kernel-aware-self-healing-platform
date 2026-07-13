import React from 'react'
import { Server, ShieldCheck, TriangleAlert, Sparkles } from 'lucide-react'
import { StatCard } from '@/components/kit'

export default function HealthSummaryCards({ warningsCount = 2, criticalCount = 0 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Servers Online"
        value="42/42"
        unit="Active"
        tone="success"
        icon={Server}
        hint={<span className="text-primary">+100% availability</span>}
      />
      <StatCard
        label="Critical Issues"
        value={String(criticalCount)}
        unit={criticalCount > 0 ? 'Critical' : 'Stable'}
        tone={criticalCount > 0 ? 'danger' : 'neutral'}
        icon={ShieldCheck}
        hint={criticalCount > 0 ? `${criticalCount} unresolved event(s)` : 'No P0/P1 events'}
      />
      <StatCard
        label="Warnings"
        value={String(warningsCount)}
        unit="P3 Level"
        tone={warningsCount > 0 ? 'warning' : 'neutral'}
        icon={TriangleAlert}
        hint={warningsCount > 0 ? `+${warningsCount} in last hour` : 'No warnings'}
      />
      <StatCard
        label="Auto Fixed Today"
        value="15"
        unit="Healing"
        tone="success"
        icon={Sparkles}
        className="ring-1 ring-primary/40 shadow-glow-primary"
        hint={<span className="text-primary">Success</span>}
      />
    </div>
  )
}
