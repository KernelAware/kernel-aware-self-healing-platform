// Mock API endpoints to simulate backend operations
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