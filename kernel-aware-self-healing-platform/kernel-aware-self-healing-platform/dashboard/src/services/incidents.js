const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "")

async function parseResponse(response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body.detail || `Backend request failed (${response.status})`)
  }
  return body
}

export async function fetchIncidents(systemId, options = {}) {
  const params = new URLSearchParams()
  if (systemId) params.set("system_id", systemId)
  if (options.excludeMonitorType) params.set("exclude_monitor_type", options.excludeMonitorType)
  if (options.monitorType) params.set("monitor_type", options.monitorType)
  if (options.status) params.set("status", options.status)
  const queryString = params.toString()
  const query = queryString ? `?${queryString}` : ""
  const response = await fetch(`${BACKEND_URL}/incidents${query}`)
  const data = await parseResponse(response)
  return Array.isArray(data) ? data : data.incidents || []
}

