import React, { useState, useEffect } from 'react'
import { 
  Shield, 
  Network, 
  Sliders, 
  History, 
  Settings as SettingsIcon,
  Copy, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Key,
  ShieldCheck,
  FileText
} from 'lucide-react'
import { Panel, PanelHeader, StatusBadge, Dot, ProgressBar, ActionButton } from '@/components/kit'
import { api } from '@/services/api'

const INITIAL_CLUSTERS = [
  { name: 'US-East-1 AWS', provider: 'AWS Cloud', level: 'LEVEL 0', status: 'Connected', tone: 'success' },
  { name: 'Edge-Node-Beta', provider: 'On-Premise', level: 'LEVEL 0', status: 'Connected', tone: 'success' },
  { name: 'EU-Central-1 GCP', provider: 'Google Cloud', level: 'LEVEL 2', status: 'Restricted', tone: 'warning' },
]

const INITIAL_AUDITS = [
  { action: 'Updated Cluster-01 Security Policy', time: 'T-MINUS 12M', ip: '192.168.1.104', tone: 'success' },
  { action: 'Rotated Root SSH Keys', time: 'T-MINUS 1H', ip: '192.168.1.104', tone: 'info' },
  { action: 'Deployed Edge-Agent-7V', time: 'T-MINUS 4H', ip: '192.168.1.104', tone: 'success' },
  { action: 'MFA Verified Login', time: 'T-MINUS 8H', ip: '192.168.1.104', tone: 'warning' },
]

export default function SettingsPage() {
  // Live uptime counter
  const [uptimeSeconds, setUptimeSeconds] = useState(342 * 86400 + 14 * 3600 + 22 * 60 + 9)
  
  // API Key management
  const [apiKey, setApiKey] = useState('sk_ebpf_live_7v82h_81f9a2d3c5e6b7d8f901234_k9q')
  const [showApiKey, setShowApiKey] = useState(false)
  const [copied, setCopied] = useState(false)

  // Preferences
  const [theme, setTheme] = useState('dark')
  const [notifyFreq, setNotifyFreq] = useState('Critical only (Level 0 alerts)')
  const [shell, setShell] = useState('zsh')
  const [saveStatus, setSaveStatus] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      setUptimeSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatUptime = (totalSeconds) => {
    const d = Math.floor(totalSeconds / (3600 * 24))
    const h = Math.floor((totalSeconds % (3600 * 24)) / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = Math.floor(totalSeconds % 60)
    return `${d}d ${h}h ${m}m ${String(s).padStart(2, '0')}s`
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const rotateApiKey = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let rand = ''
    for (let i = 0; i < 24; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setApiKey(`sk_ebpf_live_7v82h_${rand}_k9q`)
  }

  const saveConfiguration = () => {
    setSaveStatus('Saving settings...')
    setTimeout(() => {
      setSaveStatus('Configuration saved successfully!')
      setTimeout(() => setSaveStatus(''), 3000)
    }, 1000)
  }

  return (
    <div className="space-y-6">
      {/* Header Profile Section */}
      <Panel className="p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="relative">
              <div className="w-24 h-24 rounded-lg bg-secondary/10 border border-primary/20 overflow-hidden shadow-glow-primary">
                <img 
                  className="w-full h-full object-cover" 
                  alt="Root Avatar"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuASf4cW5GjGwmb0b91wHbMlDMlBtG9Aa2CRIj9c2tyxcD5Ox7xmijZPoqayxsZTEIqHftjld2scSumCws2t3O3T51-zukCk6l0PVxL_MFRnPjNcM8MH0M6jsgpZcAmzLOiiKNYYKSLs_BeEoCxKYuPUeqAuDilA97Ta68acXFIq4lu34UMjSIcO1Vk2WrQbUdSbqsdSkwMxNOa5Krc54MA1vmyuSjoRxlCO3Ky8bxKkSbBiGkwVhaNL9g"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-[10px] font-bold shadow-lg shadow-glow-primary">
                ONLINE
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">Admin-01</h1>
                <StatusBadge tone="success">ROOT ADMINISTRATOR</StatusBadge>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-2">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">System Uptime</p>
                  <p className="font-mono text-sm text-foreground mt-0.5">{formatUptime(uptimeSeconds)}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Last Login</p>
                  <p className="font-mono text-sm text-foreground mt-0.5">2026-05-24 14:02:11 UTC</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Access Protocol</p>
                  <p className="font-mono text-sm text-primary mt-0.5 font-bold">E2EE-QUANTUM-IV</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-1.5 w-full lg:w-auto">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Kernel Integrity Score</p>
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <span className="text-3xl font-bold tracking-tight text-primary">99.9%</span>
              <div className="w-36 h-2 bg-secondary/20 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full shadow-glow-primary" style={{ width: '99.9%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Grid Content Columns */}
      <div className="grid grid-cols-12 gap-4">
        {/* LHS Column: Security & Nodes */}
        <div className="col-span-12 lg:col-span-7 space-y-4">
          {/* Security Matrix */}
          <Panel className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Security Matrix</h2>
              </div>
              <span className="flex items-center gap-2 text-primary font-mono text-[11px] uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                MFA Active
              </span>
            </div>

            <div className="space-y-6">
              {/* API Key */}
              <div className="border-b border-border pb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">eBPF Monitoring API Key</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={copyToClipboard}
                      className="text-primary hover:bg-primary/10 px-2.5 py-1 text-xs transition-colors flex items-center gap-1 font-mono cursor-pointer border border-primary/20 rounded"
                    >
                      <Copy className="size-3" /> {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button 
                      onClick={rotateApiKey}
                      className="text-muted-foreground hover:bg-secondary/15 px-2.5 py-1 text-xs transition-colors flex items-center gap-1 font-mono cursor-pointer border border-border rounded"
                    >
                      <RefreshCw className="size-3" /> Rotate
                    </button>
                  </div>
                </div>

                <div className="bg-background p-3 border border-border font-mono text-xs text-primary rounded flex justify-between items-center break-all">
                  <span>
                    {showApiKey ? apiKey : `${apiKey.slice(0, 18)}*************************`}
                  </span>
                  <button 
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer ml-2"
                  >
                    {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* SSH Key */}
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-3">Master SSH Key (ED25519)</p>
                <div className="flex items-start gap-4 p-4 bg-secondary/5 border border-border rounded-lg">
                  <Key className="size-5 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <p className="font-mono text-xs font-semibold text-foreground">root-admin-production-main</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1 break-all">Fingerprint: SHA256:r8Xm9v/Q6B4Uu+K0uYI5N7L8mR0A1C2D3E4F5G6H7</p>
                    <div className="mt-3 flex gap-3">
                      <button className="text-[11px] font-mono text-primary hover:underline cursor-pointer">Download Public Key</button>
                      <button className="text-[11px] font-mono text-destructive hover:underline cursor-pointer">Revoke Access</button>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded font-bold">TRUSTED</span>
                </div>
              </div>
            </div>
          </Panel>

          {/* Node Access Control */}
          <Panel className="overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="size-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Node Access Control</h2>
              </div>
              <button className="text-primary font-mono text-xs hover:underline cursor-pointer">Request Elevated Access</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/10">
                    <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">Cluster Name</th>
                    <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">Provider</th>
                    <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">Access Level</th>
                    <th className="px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {INITIAL_CLUSTERS.map((c) => (
                    <tr key={c.name} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-foreground font-semibold">{c.name}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{c.provider}</td>
                      <td className="px-6 py-4">
                        <span className="bg-primary/20 text-primary border border-primary/10 px-2 py-0.5 rounded font-mono text-[10px]">
                          {c.level}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Dot tone={c.tone} />
                          <span className="font-mono text-xs">{c.status}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* RHS Column: Preferences & Logs */}
        <div className="col-span-12 lg:col-span-5 space-y-4">
          {/* Preferences */}
          <Panel className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Sliders className="size-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Platform Preferences</h2>
            </div>
            
            <div className="space-y-6">
              {/* Theme Selector */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-semibold text-foreground text-sm">System Theme</p>
                  <p className="text-xs text-muted-foreground">Global UI styling mode</p>
                </div>
                <div className="flex bg-background p-1 rounded-lg border border-border">
                  <button 
                    onClick={() => setTheme('dark')}
                    className={`px-3 py-1.5 rounded-md font-mono text-[10px] font-bold cursor-pointer ${
                      theme === 'dark' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-card'
                    }`}
                  >
                    DARK
                  </button>
                  <button 
                    onClick={() => setTheme('high-contrast')}
                    className={`px-3 py-1.5 rounded-md font-mono text-[10px] font-bold cursor-pointer ${
                      theme === 'high-contrast' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-card'
                    }`}
                  >
                    HIGH CONTRAST
                  </button>
                </div>
              </div>

              {/* Notification Density */}
              <div>
                <p className="font-semibold text-foreground text-sm mb-2">Notification Frequency</p>
                <select 
                  value={notifyFreq}
                  onChange={(e) => setNotifyFreq(e.target.value)}
                  className="w-full bg-secondary/10 border border-border rounded-lg py-2 px-4 text-xs text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all cursor-pointer font-mono"
                >
                  <option className="bg-card">Critical only (Level 0 alerts)</option>
                  <option className="bg-card">All Telemetry (High density)</option>
                  <option className="bg-card">Maintenance windows only</option>
                </select>
              </div>

              {/* Default Shell */}
              <div>
                <p className="font-semibold text-foreground text-sm mb-2">Default Terminal Shell</p>
                <div className="grid grid-cols-2 gap-3">
                  <label 
                    onClick={() => setShell('zsh')}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      shell === 'zsh' ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-foreground font-semibold">zsh (Oh-My-Zsh)</span>
                    </div>
                    <div className={`w-3.5 h-3.5 rounded-full border-4 ${
                      shell === 'zsh' ? 'border-primary' : 'border-border'
                    }`} />
                  </label>
                  
                  <label 
                    onClick={() => setShell('bash')}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      shell === 'bash' ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-foreground font-semibold">bash shell</span>
                    </div>
                    <div className={`w-3.5 h-3.5 rounded-full border-4 ${
                      shell === 'bash' ? 'border-primary' : 'border-border'
                    }`} />
                  </label>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-8 flex flex-col gap-2">
              {saveStatus && (
                <p className="font-mono text-xs text-center text-primary mb-1 animate-pulse">{saveStatus}</p>
              )}
              <ActionButton 
                onClick={saveConfiguration}
                variant="primary" 
                className="w-full py-3 h-10 justify-center font-bold tracking-wider cursor-pointer"
              >
                Save Configuration
              </ActionButton>
            </div>
          </Panel>

          {/* Audit Log */}
          <Panel className="flex flex-col max-h-[400px] overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="size-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">System Audit Log</h2>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {INITIAL_AUDITS.map((a, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <Dot tone={a.tone} />
                    <div className="w-px h-full bg-border mt-1" />
                  </div>
                  <div className="pb-4">
                    <p className="font-mono text-xs text-foreground font-semibold">{a.action}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1">
                      {a.time} • IP: {a.ip}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="p-4 bg-secondary/10 text-center font-mono text-[11px] text-muted-foreground hover:text-primary transition-colors cursor-pointer border-t border-border">
              View All Activity
            </button>
          </Panel>
        </div>
      </div>
    </div>
  )
}
