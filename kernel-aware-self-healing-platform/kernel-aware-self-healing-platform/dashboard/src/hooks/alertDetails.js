import { useEffect, useState } from "react"

export function useIncidentDetails(incidents = [], updateIncident = () => {}) {
  const [selectedIncidentId, setSelectedIncidentId] = useState(null)
  const selectedIncident = incidents.find(incident => incident.id === selectedIncidentId) || null

  useEffect(() => {
    if (incidents.length === 0) {
      setSelectedIncidentId(null)
      return
    }
    if (!selectedIncidentId || !incidents.some(incident => incident.id === selectedIncidentId)) {
      setSelectedIncidentId(incidents[0].id)
    }
  }, [incidents, selectedIncidentId])

  const selectIncident = id => setSelectedIncidentId(id)
  const selectAction = action => {
    if (!selectedIncidentId) return
    updateIncident(selectedIncidentId, {
      operatorAction: { ...selectedIncident?.operatorAction, selectedAction: action },
    })
  }
  const approveIncident = id => updateIncident(id, { status: "HEALING" })
  const rejectIncident = id => updateIncident(id, { status: "REJECTED" })

  return {
    selectedIncident,
    selectedIncidentId,
    selectIncident,
    selectAction,
    approveIncident,
    rejectIncident,
  }
}
