const API_BASE_URL = 'http://localhost:8000'

export const api = {
  async purgeCache() {
    await new Promise((resolve) => setTimeout(resolve, 800))
    return { success: true, message: 'Kernel cache flushed successfully' }
  },

  async killProcess(pid) {
    await new Promise((resolve) => setTimeout(resolve, 600))
    return { success: true, message: `Process with PID ${pid} terminated` }
  },

  async runDiagnostics() {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    return {
      success: true,
      stabilityIndex: 0.999,
      timestamp: new Date().toISOString(),
      issuesFound: 0,
      report: 'No critical kernel anomalies or thermal throttling detected.'
    }
  },

  async exportLogs(format = 'json') {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return { success: true, downloadUrl: '#', format }
  },

  async rebootInterface(interfaceName) {
    await new Promise((resolve) => setTimeout(resolve, 1200))
    return { success: true, message: `Interface ${interfaceName} re-initialized` }
  }
}

export async function queryPrometheus(query) {
  const response = await fetch(
    `http://localhost:9090/api/v1/query?query=${encodeURIComponent(query)}`
  )

  const json = await response.json()

  return json.data.result
}

export async function getIncidents(systemId = null) {
  const url = new URL(`${API_BASE_URL}/incidents`)
  if (systemId !== null && systemId !== undefined) {
    url.searchParams.set('system_id', String(systemId))
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })

  const json = await response.json()

  if (!response.ok) {
    throw new Error(json.detail || 'Failed to load incidents')
  }

  return Array.isArray(json) ? json : []
}

export async function getOpenIncidents(systemId = null) {
  const url = new URL(`${API_BASE_URL}/incidents/open`)
  if (systemId !== null && systemId !== undefined) {
    url.searchParams.set('system_id', String(systemId))
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })

  const json = await response.json()

  if (!response.ok) {
    throw new Error(json.detail || 'Failed to load active incidents')
  }

  return Array.isArray(json) ? json : []
}

export async function resolveIncident(incidentId) {
  const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })

  const json = await response.json()

  if (!response.ok) {
    throw new Error(json.detail || 'Failed to resolve incident')
  }

  return json
}

export async function triggerHealingAction(incidentId, payload = {}) {
  const actionPayload = {
    action: payload.action || 'restart_service',
    target: payload.target || 'nginx',
    system_id: Number(payload.system_id ?? 1)
  }

  const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}/approve-execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(actionPayload)
  })

  const text = await response.text()
  const json = text ? JSON.parse(text) : {}

  if (!response.ok) {
    throw new Error(json.detail || json.message || 'Failed to trigger healing action')
  }

  return json
}

export async function getProcess(system_id) {
  const response = await fetch(`http://localhost:8000/processes_inventory/${system_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  const json = await response.json()

  if (!response.ok) {
    throw new Error(json.detail || 'Failed to take process details')
  }

  return json
}

export async function getService(system_id) {
  const response = await fetch(
    `http://localhost:8000/services_inventory/${system_id}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )

  const json = await response.json()

  if (!response.ok) {
    throw new Error(json.detail || 'Failed to fetch service details')
  }

  return json
}

export async function userRules(form) {
  const response = await fetch('http://localhost:8000/user_rules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(form)
  })

  const json = await response.json()

  if (!response.ok) {
    throw new Error(json.detail || 'Failed to save user rule')
  }

  return json
}