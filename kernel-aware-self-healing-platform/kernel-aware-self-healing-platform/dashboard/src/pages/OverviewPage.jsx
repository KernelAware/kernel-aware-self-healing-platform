import React from 'react'
import { Activity } from 'lucide-react'
import { PageHeader, ActionButton } from '@/components/kit'
import HealthSummaryCards from '@/components/overview/HealthSummaryCards'
import MetricGauges from '@/components/overview/MetricGauges'
import ActivityFeed from '@/components/overview/ActivityFeed'
import { PerformanceIndex, GlobalFleet } from '@/components/overview/QuickStats'
import { useAlerts } from '@/hooks/useAlerts'

export default function OverviewPage() {
  const { alerts, criticalCount } = useAlerts()

  return (
    <>
      <PageHeader
        eyebrow="Node: kernel-cluster-01 · region: us-east-1"
        title="Infrastructure Overview"
        description="Fleet-wide autonomous monitoring and self-healing telemetry, updated in real time."
        actions={<ActionButton variant="primary" icon={Activity}>Live View</ActionButton>}
      />

      <div className="space-y-4">
        <HealthSummaryCards 
          warningsCount={alerts.filter(a => a.tone === 'warning').length} 
          criticalCount={criticalCount} 
        />
        
        {/* Row 1: Gauges + Performance Index */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <MetricGauges />
          <PerformanceIndex />
        </div>

        {/* Row 2: Activity Feed + Global Fleet Distribution */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ActivityFeed />
          <GlobalFleet />
        </div>
      </div>
    </>
  )
}
