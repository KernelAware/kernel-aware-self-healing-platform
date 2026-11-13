
import { getConfiguredSystemId } from "@/services/system"

// --------------------------------------------------
// Backend and Prometheus configuration
// --------------------------------------------------

const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000"
).replace(/\/+$/, "")

const PROMETHEUS_URL = (
  import.meta.env.VITE_PROMETHEUS_URL ||
  "http://localhost:9090"
).replace(/\/+$/, "")

const SYSTEM_ID = getConfiguredSystemId()

// --------------------------------------------------
// Common response handler
// --------------------------------------------------

async function handleResponse(response, fallbackMessage) {
  const text = await response.text()

  let json = {}

  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      if (response.ok) {
        return text
      }

      throw new Error(text || fallbackMessage)
    }
  }

  if (!response.ok) {
    throw new Error(
      json.detail ||
      json.message ||
      fallbackMessage
    )
  }

  return json
}

// --------------------------------------------------
// Mock API endpoints
// --------------------------------------------------

export const api = {
  async purgeCache() {
    await new Promise((resolve) => setTimeout(resolve, 800))

    return {
      success: true,
      message: "Kernel cache flushed successfully",
    }
  },

  async killProcess(pid) {
    await new Promise((resolve) => setTimeout(resolve, 600))

    return {
      success: true,
      message: `Process with PID ${pid} terminated`,
    }
  },

  async runDiagnostics() {
    await new Promise((resolve) => setTimeout(resolve, 1500))

    return {
      success: true,
      stabilityIndex: 0.999,
      timestamp: new Date().toISOString(),
      issuesFound: 0,
      report: "No critical kernel anomalies or thermal throttling detected.",
    }
  },

  async exportLogs(format = "json") {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return {
      success: true,
      downloadUrl: "#",
      format,
    }
  },

  async rebootInterface(interfaceName) {
    await new Promise((resolve) => setTimeout(resolve, 1200))

    return {
      success: true,
      message: `Interface ${interfaceName} re-initialized`,
    }
  },
}

// --------------------------------------------------
// Prometheus API
// --------------------------------------------------

export async function queryPrometheus(query) {
  const response = await fetch(
    `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`
  )

  const json = await handleResponse(
    response,
    "Prometheus query failed"
  )

  if (json.status !== "success") {
    throw new Error("Prometheus query failed")
  }

  return json.data?.result || []
}

export async function queryPrometheusMetricNames() {
  const response = await fetch(
    `${PROMETHEUS_URL}/api/v1/label/__name__/values`
  )

  const json = await handleResponse(
    response,
    "Failed to retrieve Prometheus metric names"
  )

  if (
    json.status !== "success" ||
    !Array.isArray(json.data)
  ) {
    throw new Error(
      "Prometheus returned an invalid metric-name response"
    )
  }

  return json.data
}

// --------------------------------------------------
// Incident Management API
// --------------------------------------------------

export async function getIncidents(systemId = SYSTEM_ID) {
  const url = new URL(`${API_BASE_URL}/incidents`)

  if (systemId !== null && systemId !== undefined) {
    url.searchParams.set("system_id", String(systemId))
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const json = await handleResponse(
    response,
    "Failed to load incidents"
  )

  return Array.isArray(json) ? json : []
}

export async function getOpenIncidents(systemId = SYSTEM_ID) {
  const url = new URL(`${API_BASE_URL}/incidents/open`)

  if (systemId !== null && systemId !== undefined) {
    url.searchParams.set("system_id", String(systemId))
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const json = await handleResponse(
    response,
    "Failed to load active incidents"
  )

  return Array.isArray(json) ? json : []
}

export async function resolveIncident(incidentId) {
  const response = await fetch(
    `${API_BASE_URL}/incidents/${encodeURIComponent(incidentId)}/resolve`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }
  )

  return handleResponse(
    response,
    "Failed to resolve incident"
  )
}

export async function triggerHealingAction(
  incidentId,
  payload = {}
) {
  const actionName = String(payload.action || "").trim()

  const normalizedActionKey = actionName
    .toLowerCase()
    .replace(/_/g, "-")

  const actionPayload = {
    action: actionName || "restart_service",
    target: payload.target || "nginx",
    system_id: Number(payload.system_id ?? SYSTEM_ID),
    category: payload.category || "system",
    pid: payload.pid ?? null,

    ...(normalizedActionKey === "run-command" &&
    payload.script !== undefined &&
    payload.script !== null
      ? { script: String(payload.script) }
      : {}),
  }

  const response = await fetch(
    `${API_BASE_URL}/incidents/${encodeURIComponent(incidentId)}/approve-execute`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(actionPayload),
    }
  )

  return handleResponse(
    response,
    "Failed to trigger healing action"
  )
}

// --------------------------------------------------
// Process Inventory API
// --------------------------------------------------

export async function getProcess(system_id = SYSTEM_ID) {
  const response = await fetch(
    `${API_BASE_URL}/processes_inventory/${encodeURIComponent(system_id)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  )

  return handleResponse(
    response,
    "Failed to take process details"
  )
}

// --------------------------------------------------
// Service Inventory API
// --------------------------------------------------

export async function getService(system_id = SYSTEM_ID) {
  const response = await fetch(
    `${API_BASE_URL}/services_inventory/${encodeURIComponent(system_id)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  )

  return handleResponse(
    response,
    "Failed to fetch service details"
  )
}

// --------------------------------------------------
// User Rules API
// --------------------------------------------------

export async function userRules(form) {
  const payload = {
    ...form,
    system_id: form.system_id ?? SYSTEM_ID,
  }

  const response = await fetch(
    `${API_BASE_URL}/user_rules`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  return handleResponse(
    response,
    "Failed to save user rule"
  )
}

export async function getUserRules(systemId = SYSTEM_ID) {
  const url = new URL(`${API_BASE_URL}/get_user_rules`)

  url.searchParams.set("system_id", String(systemId))

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  return handleResponse(
    response,
    "Failed to load user rules"
  )
}

export async function updateUserRule(ruleId, updates) {
  const response = await fetch(
    `${API_BASE_URL}/user_rules/${encodeURIComponent(ruleId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    }
  )

  return handleResponse(
    response,
    "Failed to update user rule"
  )
}

export async function deleteUserRule(ruleId) {
  const response = await fetch(
    `${API_BASE_URL}/user_rules/${encodeURIComponent(ruleId)}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    }
  )

  return handleResponse(
    response,
    "Failed to delete user rule"
  )
}
