import React from 'react'
import { Cog } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/kit'

export default function SystemUptime() {
  return (
<Panel>
  <div className="p-4 pt-0">
    <iframe
      src="http://localhost:3000/d-solo/adkfxpq/core-temparature?orgId=1&from=now-5m&to=now&refresh=5s&panelId=6"
      className="w-102 h-58 "
      title="BIOS Information"
    />
  </div>
</Panel>
  )
}
