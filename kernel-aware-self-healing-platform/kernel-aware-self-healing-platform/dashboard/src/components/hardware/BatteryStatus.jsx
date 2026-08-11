import React from 'react'
import { Zap } from 'lucide-react'
import { Panel, PanelHeader, ProgressBar } from '@/components/kit'

export default function BatteryStatus() {
  return (
      <Panel>
          <div className="flex gap-4">
            <iframe
              src="http://localhost:3000/d-solo/adkfxpq/core-temparature?orgId=1&from=now-5m&to=now&refresh=5s&showCategory=Panel%20links&panelId=panel-4"
              className="flex-1 h-62.5 w-50"
              frameBorder="0"
            />

            <iframe
              src="http://localhost:3000/d-solo/adkfxpq/core-temparature?orgId=1&from=now-5m&to=now&refresh=5s&showCategory=Panel%20links&panelId=panel-5"
              className="flex-1 h-62.5 w-50"
              frameBorder="0"
            />
          </div>

      </Panel>
  )
}
