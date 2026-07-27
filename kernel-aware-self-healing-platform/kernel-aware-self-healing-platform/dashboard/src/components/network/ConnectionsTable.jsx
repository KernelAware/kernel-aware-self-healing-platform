import React from 'react'

export default function ConnectionsTable() {
  return (
    <div className="w-full h-full min-h-[260px] overflow-hidden rounded-lg">
      <iframe
        src="http://localhost:3000/d-solo/ad2vwcg/new-dashboard-1?orgId=1&from=now-1m&to=now&timezone=browser&refresh=5s&tab=transformations&var-Filters=&panelId=panel-6"
        className="w-full h-full min-h-[260px] border-0"
        width="100%"
        height="100%"
        title="Network Processes"
      />
    </div>
  )
}