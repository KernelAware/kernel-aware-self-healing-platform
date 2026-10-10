import React, { useEffect, useState } from 'react'
import { HardDrive } from 'lucide-react'
import {
  Panel,
  PanelHeader,
  StatusBadge,
  ProgressBar,
  ActionButton,
} from '@/components/kit'

const PROMETHEUS_URL = 'http://localhost:7070'

export default function SmartDiskStatus() {
  const [disks, setDisks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ---------------------------------------------------------
  // Query Prometheus
  // ---------------------------------------------------------

  async function queryPrometheus(query) {
    const url =
      `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Prometheus request failed: ${response.status}`)
    }

    const result = await response.json()

    if (result.status !== 'success') {
      throw new Error('Prometheus returned an error')
    }

    return result.data.result
  }

  // ---------------------------------------------------------
  // Collect SMART metrics
  // ---------------------------------------------------------

  async function fetchSmartData() {
    try {
      setError(null)

      const [
        healthData,
        temperatureData,
        powerHoursData,
      ] = await Promise.all([
        queryPrometheus('hardware_disk_health'),
        queryPrometheus('hardware_disk_temperature_celsius'),
        queryPrometheus('hardware_disk_power_on_hours'),
      ])

      // ---------------------------------------------
      // Create lookup maps
      // ---------------------------------------------

      const healthMap = {}
      const temperatureMap = {}
      const powerHoursMap = {}

      healthData.forEach((item) => {
        const device = item.metric.device

        healthMap[device] = Number(item.value[1])
      })

      temperatureData.forEach((item) => {
        const device = item.metric.device

        temperatureMap[device] = Number(item.value[1])
      })

      powerHoursData.forEach((item) => {
        const device = item.metric.device

        powerHoursMap[device] = Number(item.value[1])
      })

      // ---------------------------------------------
      // Get all devices
      // ---------------------------------------------

      const devices = new Set([
        ...Object.keys(healthMap),
        ...Object.keys(temperatureMap),
        ...Object.keys(powerHoursMap),
      ])

      const diskList = Array.from(devices).map((device) => {
        const health = healthMap[device] ?? 0
        const temperature = temperatureMap[device] ?? null
        const powerHours = powerHoursMap[device] ?? null

        const isHealthy = health === 1

        return {
          device,
          name: getDiskName(device),

          status: isHealthy ? 'Healthy' : 'Failed',

          tone: isHealthy ? 'success' : 'warning',

          temperature,

          powerHours,

          // This is only a visual health indicator.
          // It is NOT remaining disk life.
          healthPercent: isHealthy ? 100 : 0,
        }
      })

      setDisks(diskList)
      setLoading(false)

    } catch (err) {
      console.error('Failed to fetch SMART data:', err)

      setError(err.message)
      setLoading(false)
    }
  }

  // ---------------------------------------------------------
  // Device name
  // ---------------------------------------------------------

  function getDiskName(device) {
    if (device === '/dev/nvme0n1') {
      return 'NVMe0n1 (System)'
    }

    if (device === '/dev/sda') {
      return 'SDA (Data Archive)'
    }

    return device
  }

  // ---------------------------------------------------------
  // Fetch every 5 seconds
  // ---------------------------------------------------------

  useEffect(() => {
    fetchSmartData()

    const interval = setInterval(() => {
      fetchSmartData()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // ---------------------------------------------------------
  // Loading
  // ---------------------------------------------------------

  if (loading) {
    return (
      <Panel>
        <PanelHeader title="S.M.A.R.T. Health" icon={HardDrive} />

        <div className="p-4 text-sm text-muted-foreground">
          Loading SMART data...
        </div>
      </Panel>
    )
  }

  // ---------------------------------------------------------
  // Error
  // ---------------------------------------------------------

  if (error) {
    return (
      <Panel>
        <PanelHeader title="S.M.A.R.T. Health" icon={HardDrive} />

        <div className="p-4 text-sm text-warning">
          Unable to load SMART data.
          <br />
          <span className="text-xs text-muted-foreground">
            {error}
          </span>
        </div>
      </Panel>
    )
  }

  // ---------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------

  return (
    <Panel>
      <PanelHeader title="S.M.A.R.T. Health" icon={HardDrive} />

      <div className="flex flex-col gap-3 p-4 pt-0">

        {disks.map((disk) => (
          <div
            key={disk.device}
            className="rounded-md border border-border bg-secondary/30 p-3"
          >

            {/* Disk name + status */}
            <div className="flex items-center justify-between">

              <div>
                <span className="text-sm font-medium">
                  {disk.name}
                </span>

                <div className="font-mono text-[10px] text-muted-foreground">
                  {disk.device}
                </div>
              </div>

              <StatusBadge tone={disk.tone}>
                {disk.status}
              </StatusBadge>

            </div>

            {/* Health bar */}
            <ProgressBar
              value={disk.healthPercent}
              tone={disk.tone === 'warning' ? 'warning' : 'success'}
              className="my-2"
            />

            {/* SMART information */}
            <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">

              <span>
                Power Hours:{' '}
                <span className="text-foreground">
                  {disk.powerHours !== null
                    ? `${disk.powerHours} h`
                    : 'N/A'}
                </span>
              </span>

              <span>
                Temp:{' '}
                <span className="text-foreground">
                  {disk.temperature !== null
                    ? `${disk.temperature}°C`
                    : 'N/A'}
                </span>
              </span>

            </div>

          </div>
        ))}

        {/*<ActionButton*/}
        {/*  className="w-full justify-center cursor-pointer"*/}
        {/*  onClick={fetchSmartData}*/}
        {/*>*/}
        {/*  Refresh SMART Data*/}
        {/*</ActionButton>*/}

      </div>
    </Panel>
  )
}