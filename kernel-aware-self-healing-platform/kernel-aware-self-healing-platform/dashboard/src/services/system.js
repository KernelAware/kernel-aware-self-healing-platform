const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000'
).replace(/\/+$/, '')

let configuredSystemId = null

export async function loadConfiguredSystemId() {
  const response = await fetch(`${API_BASE_URL}/system-config`)
  if (!response.ok) {
    throw new Error(`Unable to load KAISP system configuration (${response.status})`)
  }

  const configuration = await response.json()
  const systemId = Number(configuration?.system_id)
  if (!Number.isSafeInteger(systemId) || systemId <= 0) {
    throw new Error('Backend returned an invalid system_id configuration')
  }

  configuredSystemId = String(systemId)
  return configuredSystemId
}

export function getConfiguredSystemId() {
  if (configuredSystemId == null) {
    throw new Error('KAISP system configuration has not been loaded')
  }
  return configuredSystemId
}

