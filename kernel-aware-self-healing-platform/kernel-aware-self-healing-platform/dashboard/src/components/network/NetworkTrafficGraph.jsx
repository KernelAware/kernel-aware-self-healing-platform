import React from 'react'

export default function NetworkTrafficGraph() {
  return (
    <div className="w-full overflow-hidden rounded-lg">
      <iframe
        src="http://localhost:3000/d-solo/ad2vwcg/new-dashboard-1?orgId=1&from=now-1m&to=now&timezone=browser&refresh=5s&panelId=panel-5"
        className="w-full h-[500px] border-0"
        title="Traffic Telemetry Flow"
      />
    </div>
  )
}