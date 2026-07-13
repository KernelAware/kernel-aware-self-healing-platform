import React from 'react'
import { Play } from 'lucide-react'
import { PageHeader, ActionButton } from '@/components/kit'
import HealingProgressTracker from '@/components/healing/HealingProgressTracker'
import SupportedActionsList from '@/components/healing/SupportedActionsList'
import HealingHistoryTable from '@/components/healing/HealingHistoryTable'

export default function HealingPage() {
  return (
    <>
      <PageHeader
        title="Self-Healing Status"
        description="Autonomous recovery engine monitoring kernel-level events and executing predefined remediation protocols in real-time."
        actions={<ActionButton variant="primary" icon={Play}>Run Diagnostics</ActionButton>}
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <HealingProgressTracker />
          <SupportedActionsList />
        </div>

        <HealingHistoryTable />
      </div>
    </>
  )
}
