import React from 'react'
import { Fan } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/kit'

export default function FanSpeedMonitor() {
  return (
      <Panel>
          <iframe
              src="http://localhost:3000/d-solo/adkfxpq/core-temparature?orgId=1&from=now-5m&to=now&refresh=5s&showCategory=Panel%20links&panelId=panel-3"
              width="450" height="250" frameBorder="0"></iframe>
      </Panel>
  )
}
