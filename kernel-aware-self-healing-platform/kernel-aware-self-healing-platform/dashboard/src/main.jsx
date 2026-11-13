import React from 'react'
import ReactDOM from 'react-dom/client'
import { loadConfiguredSystemId } from './services/system'
import './index.css'

async function startDashboard() {
  const root = ReactDOM.createRoot(document.getElementById('root'))

  try {
    await loadConfiguredSystemId()
    const { default: App } = await import('./App')
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  } catch (error) {
    console.error('Dashboard startup failed:', error)
    root.render(
      <main role="alert" style={{ padding: 24, fontFamily: 'sans-serif' }}>
        KAISP configuration could not be loaded. Check that the Backend is
        reachable and KAISP_SYSTEM_ID is valid.
      </main>,
    )
  }
}

startDashboard()
