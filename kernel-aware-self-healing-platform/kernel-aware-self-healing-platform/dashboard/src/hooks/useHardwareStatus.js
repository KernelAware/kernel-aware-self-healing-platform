import { useEffect, useState } from 'react'
import { queryPrometheus } from '@/services/prometheus'


export function useHardwareStatus() {

  const [uptime, setUptime] = useState(null)
  const [kernel, setKernel] = useState(null)
  const [architecture, setArchitecture] = useState(null)

  // CPU temperatures
  const [cpuPackageTemperature, setCpuPackageTemperature] = useState(null)
  const [cpuAverageTemperature, setCpuAverageTemperature] = useState(null)

  // Fan
  const [fanSpeed, setFanSpeed] = useState(null)

  // Disks
  const [disks, setDisks] = useState([])


  useEffect(() => {

    let cancelled = false


    async function fetchHardwareStatus() {

      try {

        const [
          uptimeResult,
          kernelResult,
          cpuPackageResult,
          cpuAverageResult,
          fanResult,
          diskHealthResult,
          diskTemperatureResult,
          diskPowerHoursResult,
        ] = await Promise.all([

          // =================================================
          // UPTIME
          // =================================================

          queryPrometheus(
            'hardware_system_uptime_seconds'
          ),


          // =================================================
          // KERNEL
          // =================================================

          queryPrometheus(
            'hardware_kernel_info'
          ),


          // =================================================
          // CPU PACKAGE TEMPERATURE
          // =================================================

          queryPrometheus(
            'hardware_cpu_package_temperature_celsius'
          ),


          // =================================================
          // CPU AVERAGE TEMPERATURE
          // =================================================

          queryPrometheus(
            'hardware_cpu_average_temperature_celsius'
          ),


          // =================================================
          // FAN SPEED
          // =================================================

          queryPrometheus(
            'hardware_fan_speed_rpm'
          ),


          // =================================================
          // DISK HEALTH
          // =================================================

          queryPrometheus(
            'hardware_disk_health'
          ),


          // =================================================
          // DISK TEMPERATURE
          // =================================================

          queryPrometheus(
            'hardware_disk_temperature_celsius'
          ),


          // =================================================
          // DISK POWER-ON HOURS
          // =================================================

          queryPrometheus(
            'hardware_disk_power_on_hours'
          ),

        ])


        if (cancelled) {
          return
        }


        // =================================================
        // UPTIME
        // =================================================

        if (uptimeResult.length > 0) {

          const seconds = Number(
            uptimeResult[0].value[1]
          )

          setUptime(seconds)

        }


        // =================================================
        // KERNEL
        // =================================================

        if (kernelResult.length > 0) {

          const metric = kernelResult[0].metric

          setKernel(
            metric.kernel || 'Unknown'
          )

          setArchitecture(
            metric.architecture || 'Unknown'
          )

        }


        // =================================================
        // CPU PACKAGE TEMPERATURE
        // =================================================

        if (cpuPackageResult.length > 0) {

          const temperature = Number(
            cpuPackageResult[0].value[1]
          )

          setCpuPackageTemperature(
            Math.round(temperature * 10) / 10
          )

        }


        // =================================================
        // CPU AVERAGE TEMPERATURE
        // =================================================

        if (cpuAverageResult.length > 0) {

          const temperature = Number(
            cpuAverageResult[0].value[1]
          )

          setCpuAverageTemperature(
            Math.round(temperature * 10) / 10
          )

        }


        // =================================================
        // FAN SPEED
        // =================================================

        if (fanResult.length > 0) {

          const rpm = Number(
            fanResult[0].value[1]
          )

          setFanSpeed(
            Math.round(rpm)
          )

        }


        // =================================================
        // DISK DATA
        // =================================================

        const diskMap = {}


        // =================================================
        // DISK HEALTH
        // =================================================

        diskHealthResult.forEach((result) => {

          const device = result.metric.device

          if (!device) {
            return
          }

          if (!diskMap[device]) {

            diskMap[device] = {
              device,
              health: false,
              temperature: null,
              powerOnHours: null,
            }

          }


          diskMap[device].health =
            Number(result.value[1]) === 1

        })


        // =================================================
        // DISK TEMPERATURE
        // =================================================

        diskTemperatureResult.forEach((result) => {

          const device = result.metric.device

          if (!device) {
            return
          }

          if (!diskMap[device]) {

            diskMap[device] = {
              device,
              health: false,
              temperature: null,
              powerOnHours: null,
            }

          }


          diskMap[device].temperature =
            Number(result.value[1])

        })


        // =================================================
        // DISK POWER-ON HOURS
        // =================================================

        diskPowerHoursResult.forEach((result) => {

          const device = result.metric.device

          if (!device) {
            return
          }

          if (!diskMap[device]) {

            diskMap[device] = {
              device,
              health: false,
              temperature: null,
              powerOnHours: null,
            }

          }


          diskMap[device].powerOnHours =
            Number(result.value[1])

        })


        // =================================================
        // UPDATE DISKS
        // =================================================

        setDisks(
          Object.values(diskMap)
        )

      } catch (error) {

        console.error(
          'Failed to fetch hardware status:',
          error
        )

      }

    }


    // =====================================================
    // INITIAL FETCH
    // =====================================================

    fetchHardwareStatus()


    // =====================================================
    // REFRESH EVERY 5 SECONDS
    // =====================================================

    const interval = setInterval(
      fetchHardwareStatus,
      5000
    )


    // =====================================================
    // CLEANUP
    // =====================================================

    return () => {

      cancelled = true

      clearInterval(interval)

    }

  }, [])


  // =======================================================
  // RETURN HARDWARE DATA
  // =======================================================

  return {

    uptime,

    kernel,

    architecture,

    cpuPackageTemperature,

    cpuAverageTemperature,

    fanSpeed,

    disks,

  }

}


// =========================================================
// FORMAT UPTIME
// =========================================================

export function formatUptime(totalSeconds) {

  if (totalSeconds == null) {
    return '--'
  }


  const seconds = Math.floor(
    totalSeconds
  )


  const days = Math.floor(
    seconds / 86400
  )


  const hours = Math.floor(
    (seconds % 86400) / 3600
  )


  const minutes = Math.floor(
    (seconds % 3600) / 60
  )


  const secs = seconds % 60


  return `${days}d ${hours}h ${minutes}m ${secs}s`
}