import React from 'react'
import { Cog } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/kit'

export default function SystemUptime() {
  return (
    <Panel>
      <PanelHeader title="Motherboard BIOS & System Status" icon={Cog} />
      <div className="space-y-1 p-4 pt-0 font-mono text-[11px] text-muted-foreground">
        <p>VER: <span className="text-foreground">AMI-SENTINEL-X86-9921</span></p>
        <p>DATE: <span className="text-foreground">2024-03-12</span></p>
        <p>FEATURES: <span className="text-foreground">AES-NI, VT-X, SGX, TPM 2.0</span></p>
        <p>SECURE BOOT: <span className="text-primary">ENABLED</span></p>
        <div className="mt-3 flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 p-3">
          <span className="uppercase tracking-wider">CMOS Battery Health</span>
          <span className="text-primary">100%</span>
        </div>
      </div>
    </Panel>
  )
}
