const PROMETHEUS_URL = 'http://localhost:7070'

export async function queryPrometheus(query) {
  const response = await fetch(
    `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`
  )

  if (!response.ok) {
    throw new Error(`Prometheus request failed: ${response.status}`)
  }

  const data = await response.json()

  if (data.status !== 'success') {
    throw new Error('Prometheus query failed')
  }

  return data.data.result
}