import React from 'react'

export default function NetworkSpeedDisplay() {

    console.log("NetworkSpeedDisplay loaded")

  return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <iframe
              src="http://localhost:3000/d-solo/ad2vwcg/new-dashboard-1?orgId=1&from=now-1h&to=now&timezone=browser&refresh=5s&panelId=panel-1"
              width="100%" height="180" frameBorder="0"></iframe>
          <iframe
              src="http://localhost:3000/d-solo/ad2vwcg/new-dashboard-1?orgId=1&from=now-1h&to=now&timezone=browser&refresh=5s&panelId=panel-2"
              width="100%" height="180" frameBorder="0"></iframe>
          <iframe
              src="http://localhost:3000/d-solo/ad2vwcg/new-dashboard-1?orgId=1&from=now-1h&to=now&timezone=browser&refresh=5s&panelId=panel-3"
              width="100%" height="180" frameBorder="0"></iframe>
          <iframe
              src="http://localhost:3000/d-solo/ad2vwcg/new-dashboard-1?orgId=1&from=now-1h&to=now&timezone=browser&refresh=5s&panelId=panel-4"
              width="100%" height="180" frameBorder="0"></iframe>
      </div>
  )
}