import React from 'react'
import { Download, RefreshCw, Radio, Wifi, WifiOff } from 'lucide-react'
import { PageHeader, ActionButton, Panel, PanelHeader, StatusBadge } from '@/components/kit'
import NetworkSpeedDisplay from '@/components/network/NetworkSpeedDisplay'
import NetworkTrafficGraph from '@/components/network/NetworkTrafficGraph'
import ConnectionsTable from '@/components/network/ConnectionsTable'

export default function NetworkPage() {
  return (
    <>
      <PageHeader
        title="Network Telemetry"
        description="Real-time kernel-level traffic analysis across all active interfaces. Monitoring packet integrity and autonomous healing of routing bottlenecks."
        actions={
          <>
            <ActionButton variant="primary" icon={RefreshCw}>Reboot Interface</ActionButton>
            <ActionButton icon={Download}>Export PCAP</ActionButton>
          </>
        }
      />

      <div className="space-y-4">
        <NetworkSpeedDisplay />

        <NetworkTrafficGraph />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel>
            <PanelHeader title="Interface Diagnostics" icon={Radio} />
            <div className="flex flex-col gap-3 p-4 pt-0">
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center gap-2 font-mono text-sm">
                  <Wifi className="size-4 text-primary" />
                  <span className="text-primary">eth0</span>
                  <StatusBadge tone="success">Connected</StatusBadge>
                  <span className="ml-auto text-muted-foreground">10.0.42.15</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <span className="text-muted-foreground">ERRORS <span className="text-foreground">0 TX / 0 RX</span></span>
                  <span className="text-muted-foreground">DROPS <span className="text-warning">12 RX</span></span>
                </div>
              </div>
              <div className="rounded-md border border-border bg-secondary/30 p-3">
                <div className="flex items-center gap-2 font-mono text-sm">
                  <WifiOff className="size-4 text-muted-foreground" />
                  <span className="text-foreground/70">wlan0</span>
                  <StatusBadge tone="muted">Idle</StatusBadge>
                  <span className="ml-auto text-muted-foreground">Disconnected</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px] text-muted-foreground">
                  <span>ERRORS --</span>
                  <span>DROPS --</span>
                </div>
              </div>
            </div>
          </Panel>

          <ConnectionsTable />
        </div>
      </div>
    </>
  )
}
