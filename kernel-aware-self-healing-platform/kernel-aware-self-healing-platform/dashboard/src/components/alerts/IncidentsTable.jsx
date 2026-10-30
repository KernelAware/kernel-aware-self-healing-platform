import React, { useState } from 'react'
import { ListFilter, Search } from 'lucide-react'
import { Panel, PanelHeader, ActionButton, StatusBadge, Dot } from '@/components/kit'

export default function IncidentsTable({ incidents }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const filtered = incidents.filter((h) => {
    const normalizedStatus = h.status === 'RESOLVED' ? 'resolved' : 'open'
    const matchesSearch =
      h.title.toLowerCase().includes(search.toLowerCase()) ||
      h.id.toLowerCase().includes(search.toLowerCase()) ||
      h.prio.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter
    const matchesPriority = priorityFilter === 'all' || h.prio === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  return (
    <Panel className="mt-4">
      <PanelHeader
        title="Incident History"
        icon={ListFilter}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search incidents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-44 rounded-md border border-input bg-background pl-8 pr-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 font-mono text-[11px] text-foreground outline-none focus:border-ring"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 font-mono text-[11px] text-foreground outline-none focus:border-ring"
            >
              <option value="all">All Priority</option>
              <option value="P0">P0</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
            </select>

            <ActionButton icon={ListFilter} className="h-8 cursor-pointer">Filter</ActionButton>
          </div>
        }
      />
      <div className="max-h-[360px] overflow-y-auto overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
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
                  <StatusBadge tone={h.prio === 'P0' ? 'danger' : h.prio === 'P1' ? 'warning' : 'muted'}>
                    {h.prio}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 font-mono text-foreground/80">
                    <Dot tone={h.status === 'RESOLVED' ? 'success' : 'muted'} />
                    {h.status === 'RESOLVED' ? 'Resolved' : 'Open'}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">{h.start}</td>
                <td className="px-4 py-3 font-mono text-foreground/80">{h.res}</td>
                <td className="px-4 py-3 text-right text-accent hover:underline">
                  <button className="cursor-pointer">View Log</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}