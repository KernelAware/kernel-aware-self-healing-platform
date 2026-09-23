import React from 'react'

import IncidentDetailsResponse from '@/components/alerts/IncidentDetailResponse.jsx'
import IncidentRootCause from "@/components/alerts/IncidentRootCause.jsx";
import OperatorActionRequired from "@/components/alerts/OperatorActionRequired.jsx";


export default function IncidentDetailView({
    timeline ,
    selectIncident,
    selectedIncident,
    approveIncident,
    rejectIncident
}) {

  return (
    <div className="flex flex-col gap-4 lg:col-span-2">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

        <IncidentDetailsResponse
            selectIncident={selectIncident}
            selectedIncident={selectedIncident}
        />
        <IncidentRootCause timeline={timeline}/>

      </div>
      <OperatorActionRequired
            selectedIncident={selectedIncident}
            approveIncident={approveIncident}
            rejectIncident={rejectIncident}
      />
    </div>
  )
}