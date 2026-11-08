function generationTimestamp(generation) {
  const match = String(generation || "").match(/^(\d{16,})-/)
  return match ? BigInt(match[1]) : null
}

export function isStaleAnalyticsGeneration(candidate, current) {
  if (!candidate || !current || candidate === current) return false
  const candidateTimestamp = generationTimestamp(candidate)
  const currentTimestamp = generationTimestamp(current)
  return candidateTimestamp !== null
    && currentTimestamp !== null
    && candidateTimestamp < currentTimestamp
}

export function isCurrentRunDiskIncident(incident, generation) {
  return Boolean(
    generation
    && incident?.analytics_generation === generation
    && String(incident?.monitor_type || incident?.incident_type || incident?.category || "")
      .trim()
      .toLowerCase() === "disk",
  )
}

export function currentRunDiskIncidents(rows, generation) {
  if (!generation || !Array.isArray(rows)) return []
  return rows.filter(incident => (
    isCurrentRunDiskIncident(incident, generation)
    && !["RESOLVED", "CLOSED"].includes(String(incident.status).toUpperCase())
  ))
}
