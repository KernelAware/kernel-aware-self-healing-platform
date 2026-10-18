import React, { useState } from 'react'
import { ListFilter, Search } from 'lucide-react'
import { Panel, PanelHeader, ActionButton, StatusBadge, Dot } from '@/components/kit'

export default function IncidentsTable({ incidents, loading = false }) {
  const [search, setSearch] = useState('')

  const rows = Array.isArray(incidents) ? incidents : []
  const filtered = rows.filter((h) => [h.title, h.id, h.priority, h.severity, h.status]
    .some(value => String(value || '').toLowerCase().includes(search.toLowerCase())))
  const formatTime = value => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
  }
  const resolutionTime = incident => {
    if (!incident.created_at || !incident.resolved_at) return '—'
    const seconds = Math.max(0, Math.round((Date.parse(incident.resolved_at) - Date.parse(incident.created_at)) / 1000))
    if (!Number.isFinite(seconds)) return '—'
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }

  return (
    <Panel className="mt-4">
      <PanelHeader
        title="Incident History"
        icon={ListFilter}
        action={
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search incidents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-44 rounded-md border border-input bg-background pl-8 pr-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
              />
            </div>
            <ActionButton icon={ListFilter} className="h-8 cursor-pointer">Filter</ActionButton>
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-y border-border font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-medium">ID</th>
              <th className="px-4 py-2.5 text-left font-medium">Incident Title</th>
              <th className="px-4 py-2.5 text-left font-medium">Priority</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-left font-medium">Start Time</th>
              <th className="px-4 py-2.5 text-left font-medium">Res. Time</th>
              <th className="px-4 py-2.5 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {filtered.map((h) => (
              <tr key={h.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                <td className="px-4 py-3 font-mono text-muted-foreground">{h.id}</td>
                <td className="px-4 py-3 font-medium text-foreground">{h.title}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={String(h.severity).toLowerCase() === 'critical' ? 'danger' : String(h.severity).toLowerCase() === 'high' ? 'warning' : 'muted'}>
                    {h.priority || '—'}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 font-mono text-foreground/80">
                    <Dot tone={['RESOLVED', 'CLOSED'].includes(String(h.status).toUpperCase()) ? 'success' : 'muted'} />{h.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{formatTime(h.created_at)}</td>
                <td className="px-4 py-3 font-mono text-foreground/80">{resolutionTime(h)}</td>
                <td className="px-4 py-3 text-right text-accent hover:underline">
                  <button className="cursor-pointer">View Log</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">
                  {loading ? 'Loading incident history…' : rows.length === 0 ? 'No incident history is available.' : 'No incidents match this search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
