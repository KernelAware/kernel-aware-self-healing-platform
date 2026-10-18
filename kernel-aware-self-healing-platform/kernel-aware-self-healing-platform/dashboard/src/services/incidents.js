const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "")

async function parseResponse(response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body.detail || `Backend request failed (${response.status})`)
  }
  return body
}

export async function fetchIncidents(systemId) {
  const query = systemId ? `?system_id=${encodeURIComponent(systemId)}` : ""
  const response = await fetch(`${BACKEND_URL}/incidents${query}`)
  const data = await parseResponse(response)
  return Array.isArray(data) ? data : data.incidents || []
}

