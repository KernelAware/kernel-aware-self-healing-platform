import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import Navbar from '@/components/Navbar'
import StatusFooter from '@/components/StatusFooter'

// Import pages
import OverviewPage from '@/pages/OverviewPage'
import CpuPage from '@/pages/CpuPage'
import MemoryDiskPage from '@/pages/MemoryDiskPage'
import HardwarePage from '@/pages/HardwarePage'
import NetworkPage from '@/pages/NetworkPage'
import ProcessPage from '@/pages/ProcessPage'
import AlertsPage from '@/pages/AlertsPage'
import HealingPage from '@/pages/HealingPage'
import LogsPage from '@/pages/LogsPage'
import SettingsPage from '@/pages/SettingsPage'
import PolicyPage from '@/pages/PolicyPage'

function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-6 py-8">{children}</div>
        </main>
        <StatusFooter />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/*"
          element={
            <DashboardLayout>
              <Routes>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/cpu" element={<CpuPage />} />
                <Route path="/memory" element={<MemoryDiskPage />} />
                <Route path="/hardware" element={<HardwarePage />} />
                <Route path="/network" element={<NetworkPage />} />
                <Route path="/processes" element={<ProcessPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/self-healing" element={<HealingPage />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/policy" element={<PolicyPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </DashboardLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
