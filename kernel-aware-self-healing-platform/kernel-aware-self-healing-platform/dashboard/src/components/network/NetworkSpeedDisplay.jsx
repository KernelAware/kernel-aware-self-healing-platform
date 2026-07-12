import React from 'react'
import { Download, Upload, Waypoints, TriangleAlert } from 'lucide-react'
import { StatCard, StatusBadge } from '@/components/kit'
import { useMetrics } from '@/hooks/useMetrics'

export default function NetworkSpeedDisplay() {
  const metrics = useMetrics()

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard 
        label="Download Bandwidth" 
        value={typeof metrics.network.rx === 'number' ? metrics.network.rx.toFixed(2) : metrics.network.rx} 
        unit="Gbps" 
        tone="success" 
        icon={Download} 
        hint={<span className="text-primary">Peak: 1.8 Gbps ↑12%</span>} 
      />
      <StatCard 
        label="Upload Bandwidth" 
        value={typeof metrics.network.tx === 'number' ? metrics.network.tx.toFixed(1) : metrics.network.tx} 
        unit="Mbps" 
        tone="success" 
        icon={Upload} 
        hint="Peak: 980 Mbps · Stable" 
      />
      <StatCard 
        label="Active Connections" 
        value="2,842" 
        tone="neutral" 
        icon={Waypoints} 
        hint={
          <span className="flex gap-2">
            <StatusBadge tone="info">TCP: 2.1k</StatusBadge>
            <StatusBadge tone="muted">UDP: 742</StatusBadge>
          </span>
        } 
      />
      <StatCard 
        label="Packet Loss %" 
        value="0.002%" 
        tone="success" 
        icon={TriangleAlert} 
        hint={<span className="text-primary">Optimal</span>} 
      />
    </div>
  )
}
