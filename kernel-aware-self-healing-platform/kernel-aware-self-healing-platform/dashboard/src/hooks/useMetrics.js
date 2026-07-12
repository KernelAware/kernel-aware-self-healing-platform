import { useState, useEffect } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'

export function useMetrics() {
  const wsData = useWebSocket('metrics')
  const [metrics, setMetrics] = useState({
    cpu: 32.2,
    memory: 64,
    diskIO: { read: 245, write: 182 },
    network: { rx: 1.24, tx: 450.8 },
  })

  useEffect(() => {
    if (wsData) {
      setMetrics(wsData)
    }
  }, [wsData])

  return metrics
}
