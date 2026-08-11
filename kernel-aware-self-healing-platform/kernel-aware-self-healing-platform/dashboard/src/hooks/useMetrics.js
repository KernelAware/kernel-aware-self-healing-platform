import { useState, useEffect } from 'react'
import { queryPrometheus } from '../services/api'

export function useMetrics() {
  const [metrics, setMetrics] = useState({
    cpu:     0,
    load1:   0,
    load5:   0,
    load15:  0,
    cores:   [],
    freq:    0,
    memory:  0,
    diskIO:  { read: 0, write: 0 },
    network: { rx: 0, tx: 0 },
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [
          cpuRes, load1Res, load5Res, load15Res,
          coresRes, freqRes
        ] = await Promise.all([
          queryPrometheus('cpu_usage_percent'),
          queryPrometheus('cpu_load_1min'),
          queryPrometheus('cpu_load_5min'),
          queryPrometheus('cpu_load_15min'),
          queryPrometheus('cpu_core_usage_percent'),
          queryPrometheus('cpu_freq_current_mhz'),
        ])

        setMetrics(prev => ({
          ...prev,
          cpu:    parseFloat(cpuRes[0]?.value[1]    || 0),
          load1:  parseFloat(load1Res[0]?.value[1]  || 0),
          load5:  parseFloat(load5Res[0]?.value[1]  || 0),
          load15: parseFloat(load15Res[0]?.value[1] || 0),
          freq:   parseFloat(freqRes[0]?.value[1]   || 0),
          cores:  coresRes.map(c => ({
            core:  c.metric.core,
            value: parseFloat(c.value[1])
          }))
        }))

      } catch (err) {
        console.error('Metrics fetch failed:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
    const interval = setInterval(fetchAll, 15000)
    return () => clearInterval(interval)
  }, [])

  return { metrics, loading }
}