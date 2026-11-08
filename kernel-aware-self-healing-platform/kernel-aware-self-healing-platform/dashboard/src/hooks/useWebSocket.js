import { useEffect, useState } from 'react'
import { wsBroker } from '@/services/websocket'
import { getConfiguredSystemId } from '@/services/system'

export function useWebSocket(typeFilter) {
  const [data, setData] = useState(null)

  useEffect(() => {
    wsBroker.connect(getConfiguredSystemId())

    const unsubscribe = wsBroker.subscribe((msg) => {
      if (!typeFilter || msg.type === typeFilter) {
        setData(msg.data)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [typeFilter])

  return data
}