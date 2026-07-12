import React from 'react'
import { Microchip } from 'lucide-react'
import { PageHeader, ActionButton, Panel, PanelHeader, Dot } from '@/components/kit'
import TemperatureMonitor from '@/components/hardware/TemperatureMonitor'
import SmartDiskStatus from '@/components/hardware/SmartDiskStatus'
import FanSpeedMonitor from '@/components/hardware/FanSpeedMonitor'
import BatteryStatus from '@/components/hardware/BatteryStatus'
import SystemUptime from '@/components/hardware/SystemUptime'

const sensors = [
  { id: 'VCC_CORE', comp: 'CPU Vcore', cur: '1.21V', peak: '1.34V', thr: '1.45V', tone: 'success' },
  { id: 'VDD_DRAM', comp: 'DDR5 Channel A', cur: '1.10V', peak: '1.10V', thr: '1.25V', tone: 'success' },
  { id: 'TEMP_PCH', comp: 'Southbridge/Chipset', cur: '54°C', peak: '58°C', thr: '85°C', tone: 'warning' },
  { id: 'FAN_PUMP', comp: 'AIO Liquid Pump', cur: '2420 RPM', peak: '3100 RPM', thr: '600 RPM', tone: 'success' },
  { id: 'POWER_VOUT', comp: 'PSU +12V Rail', cur: '12.02V', peak: '12.18V', thr: '11.40V', tone: 'success' },
]

export default function HardwarePage() {
  return (
    <>
      <PageHeader
        title="Hardware Health Architecture"
        description="Real-time low-level kernel monitoring & sensory telemetry."
        actions={
          <>
            <ActionButton>Uptime 212:14:02:44</ActionButton>
            <ActionButton variant="primary">Kernel 6.5.0-Sentinel-X86</ActionButton>
          </>
        }
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <TemperatureMonitor />
          <SmartDiskStatus />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <FanSpeedMonitor />
          <BatteryStatus />
          <SystemUptime />
        </div>

        <Panel className="mt-4">
          <PanelHeader title="All Hardware Sensors Overview" icon={Microchip} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-y border-border font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">Sensor ID</th>
                  <th className="px-4 py-2.5 text-left font-medium">Component</th>
                  <th className="px-4 py-2.5 text-left font-medium">Current</th>
                  <th className="px-4 py-2.5 text-left font-medium">Peak</th>
                  <th className="px-4 py-2.5 text-left font-medium">Threshold</th>
                  <th className="px-4 py-2.5 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {sensors.map((s) => (
                  <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                    <td className="px-4 py-3 text-foreground">{s.id}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.comp}</td>
                    <td className={`px-4 py-3 ${s.tone === 'warning' ? 'text-warning' : 'text-primary'}`}>{s.cur}</td>
                    <td className="px-4 py-3 text-foreground">{s.peak}</td>
                    <td className="px-4 py-3 text-foreground">{s.thr}</td>
                    <td className="px-4 py-3 text-center"><Dot tone={s.tone} className="mx-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  )
}
