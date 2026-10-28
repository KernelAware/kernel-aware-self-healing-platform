import React from 'react'
import { Microchip } from 'lucide-react'

import {
  PageHeader,
  ActionButton,
  Panel,
  PanelHeader,
  Dot,
} from '@/components/kit'

import TemperatureMonitor from '@/components/hardware/TemperatureMonitor'
import SmartDiskStatus from '@/components/hardware/SmartDiskStatus'
import FanSpeedMonitor from '@/components/hardware/FanSpeedMonitor'
import BatteryStatus from '@/components/hardware/BatteryStatus'
import SystemUptime from '@/components/hardware/SystemUptime'

import {
  useHardwareStatus,
  formatUptime,
} from '@/hooks/useHardwareStatus'


export default function HardwarePage() {

  const {
    uptime,
    kernel,
    architecture,

    // Live Prometheus values
    cpuPackageTemperature,
    cpuAverageTemperature,
    fanSpeed,
    disks,
  } = useHardwareStatus()


  // ---------------------------------------------------------
  // BUILD LIVE SENSOR LIST
  // ---------------------------------------------------------

  const sensors = []


  // ---------------------------------------------------------
  // CPU PACKAGE TEMPERATURE
  // ---------------------------------------------------------

  if (
    cpuPackageTemperature !== null &&
    cpuPackageTemperature !== undefined
  ) {

    sensors.push({
      id: 'CPU_PACKAGE',
      comp: 'CPU Package Temperature',
      cur: `${cpuPackageTemperature}°C`,
      thr: '85°C',

      tone:
        cpuPackageTemperature >= 85
          ? 'danger'
          : cpuPackageTemperature >= 75
            ? 'warning'
            : 'success',
    })

  }


  // ---------------------------------------------------------
  // CPU AVERAGE TEMPERATURE
  // ---------------------------------------------------------

  if (
    cpuAverageTemperature !== null &&
    cpuAverageTemperature !== undefined
  ) {

    sensors.push({
      id: 'CPU_AVG',
      comp: 'CPU Average Temperature',
      cur: `${cpuAverageTemperature}°C`,
      thr: '85°C',

      tone:
        cpuAverageTemperature >= 85
          ? 'danger'
          : cpuAverageTemperature >= 75
            ? 'warning'
            : 'success',
    })

  }


  // ---------------------------------------------------------
  // FAN
  // ---------------------------------------------------------

  if (
    fanSpeed !== null &&
    fanSpeed !== undefined
  ) {

    sensors.push({
      id: 'FAN_1',
      comp: 'Fan 1',
      cur: `${fanSpeed} RPM`,
      thr: '--',

      tone:
        fanSpeed > 0
          ? 'success'
          : 'danger',
    })

  }


  // ---------------------------------------------------------
  // DISKS
  // ---------------------------------------------------------

  if (Array.isArray(disks)) {

    disks.forEach((disk) => {

      const device = disk.device

      const deviceName =
        device === '/dev/nvme0n1'
          ? 'NVMe0n1'
          : device === '/dev/sda'
            ? 'SDA'
            : device.replace('/dev/', '').toUpperCase()


      // -----------------------------------------------------
      // SMART HEALTH
      // -----------------------------------------------------

      sensors.push({

        id: `${deviceName}_HEALTH`,

        comp: `${deviceName} SMART Health`,

        cur: disk.health
          ? 'PASSED'
          : 'FAILED',

        thr: 'PASSED',

        tone: disk.health
          ? 'success'
          : 'danger',

      })


      // -----------------------------------------------------
      // DISK TEMPERATURE
      // -----------------------------------------------------

      if (
        disk.temperature !== null &&
        disk.temperature !== undefined
      ) {

        const threshold =
          deviceName === 'NVMe0n1'
            ? 85
            : 70


        sensors.push({

          id: `${deviceName}_TEMP`,

          comp: `${deviceName} Temperature`,

          cur: `${disk.temperature}°C`,

          thr: `${threshold}°C`,

          tone:
            disk.temperature >= threshold
              ? 'danger'
              : disk.temperature >= threshold - 15
                ? 'warning'
                : 'success',

        })

      }


      // -----------------------------------------------------
      // POWER-ON HOURS
      // -----------------------------------------------------

      if (
        disk.powerOnHours !== null &&
        disk.powerOnHours !== undefined
      ) {

        sensors.push({

          id: `${deviceName}_POWER`,

          comp: `${deviceName} Power-On Hours`,

          cur: `${disk.powerOnHours} h`,

          thr: '--',

          tone: 'success',

        })

      }

    })

  }


  return (
    <>
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <PageHeader

        title="Hardware Health Architecture"

        description="Real-time low-level kernel monitoring & sensory telemetry."

        actions={
          <>

            <ActionButton>
              Uptime {formatUptime(uptime)}
            </ActionButton>


            <ActionButton variant="primary">
              Kernel {kernel || '--'}
            </ActionButton>

          </>
        }

      />


      {/* =====================================================
          HARDWARE COMPONENTS
      ====================================================== */}

      <div className="space-y-4">


        {/* =================================================
            CPU + SMART
        ================================================== */}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          <TemperatureMonitor />

          <SmartDiskStatus />

        </div>


        {/* =================================================
            FAN + BATTERY + UPTIME
        ================================================== */}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          <FanSpeedMonitor />

          <BatteryStatus />

          <SystemUptime />

        </div>


        {/* =================================================
            ALL HARDWARE SENSORS
        ================================================== */}

        <Panel className="mt-4">

          <PanelHeader
            title="All Hardware Sensors Overview"
            icon={Microchip}
          />


          <div className="overflow-x-auto">

            <table className="w-full min-w-[720px] text-sm">


              {/* =================================================
                  TABLE HEADER
              ================================================== */}

              <thead>

                <tr className="border-y border-border font-mono text-[11px] uppercase tracking-wider text-muted-foreground">

                  <th className="px-4 py-2.5 text-left font-medium">
                    Sensor ID
                  </th>

                  <th className="px-4 py-2.5 text-left font-medium">
                    Component
                  </th>

                  <th className="px-4 py-2.5 text-left font-medium">
                    Current
                  </th>

                  <th className="px-4 py-2.5 text-left font-medium">
                    Threshold
                  </th>

                  <th className="px-4 py-2.5 text-center font-medium">
                    Status
                  </th>

                </tr>

              </thead>


              {/* =================================================
                  TABLE BODY
              ================================================== */}

              <tbody className="font-mono text-xs">

                {sensors.map((sensor) => (

                  <tr
                    key={sensor.id}
                    className="border-b border-border/60 last:border-0 hover:bg-secondary/40"
                  >

                    {/* Sensor ID */}

                    <td className="px-4 py-3 text-foreground">
                      {sensor.id}
                    </td>


                    {/* Component */}

                    <td className="px-4 py-3 text-muted-foreground">
                      {sensor.comp}
                    </td>


                    {/* Current */}

                    <td
                      className={`px-4 py-3 ${
                        sensor.tone === 'danger'
                          ? 'text-destructive'
                          : sensor.tone === 'warning'
                            ? 'text-warning'
                            : 'text-primary'
                      }`}
                    >
                      {sensor.cur}
                    </td>


                    {/* Threshold */}

                    <td className="px-4 py-3 text-foreground">
                      {sensor.thr}
                    </td>


                    {/* Status */}

                    <td className="px-4 py-3 text-center">

                      <Dot
                        tone={sensor.tone}
                        className="mx-auto"
                      />

                    </td>

                  </tr>

                ))}


                {/* No data */}

                {sensors.length === 0 && (

                  <tr>

                    <td
                      colSpan="5"
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No hardware sensor data available
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </Panel>

      </div>
    </>
  )
}