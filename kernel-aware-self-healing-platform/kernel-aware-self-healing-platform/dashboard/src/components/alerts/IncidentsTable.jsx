import React, { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ListFilter, Search, X } from 'lucide-react'
import { Panel, PanelHeader, StatusBadge, Dot } from '@/components/kit'

const SEVERITY_ORDER = ['warning', 'high', 'critical']

const openedAt = incident => incident.opened_at || incident.created_at || incident.detected_at || incident.start
const metricOf = incident => incident.metric || incident.trigger?.metric || incident.alert?.metric
const targetOf = incident => incident.target || incident.process || incident.alert?.target
const idOf = incident => incident.incident_id || incident.id

function collectSearchText(value, output) {
  if (value === null || value === undefined) return
  if (typeof value === 'string' || typeof value === 'number') {
    output.push(String(value))
    return
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectSearchText(item, output))
    return
  }
  if (typeof value === 'object') {
    Object.values(value).forEach(item => collectSearchText(item, output))
  }
}

function searchableText(incident) {
  const values = []
  collectSearchText([
    idOf(incident),
    incident.rule_id,
    metricOf(incident),
    targetOf(incident),
    incident.severity,
    incident.status,
    incident.priority,
    incident.category,
    incident.title,
    incident.description,
    incident.details,
    incident.message,
    incident.body,
    incident.detail,
    incident.alert,
  ], values)
  return values.join(' ').toLowerCase()
}

function compareText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''), undefined, {
    sensitivity: 'base',
    numeric: true,
  })
}

function compareSeverity(left, right) {
  const leftValue = String(left ?? '').toLowerCase()
  const rightValue = String(right ?? '').toLowerCase()
  const leftRank = SEVERITY_ORDER.indexOf(leftValue)
  const rightRank = SEVERITY_ORDER.indexOf(rightValue)
  if (leftRank !== -1 || rightRank !== -1) {
    if (leftRank === -1) return 1
    if (rightRank === -1) return -1
    if (leftRank !== rightRank) return leftRank - rightRank
  }
  return compareText(leftValue, rightValue)
}

function compareDates(left, right) {
  const leftTime = left ? Date.parse(left) : Number.NaN
  const rightTime = right ? Date.parse(right) : Number.NaN
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) return leftTime - rightTime
  if (Number.isFinite(leftTime)) return -1
  if (Number.isFinite(rightTime)) return 1
  return compareText(left, right)
}

function valueForSort(incident, key) {
  switch (key) {
    case 'id': return idOf(incident)
    case 'title': return incident.title || incident.description
    case 'metric': return metricOf(incident)
    case 'target': return targetOf(incident)
    case 'severity': return incident.severity
    case 'priority': return incident.priority
    case 'status': return incident.status
    case 'opened_at': return openedAt(incident)
    case 'resolution': {
      const start = openedAt(incident)
      if (!start || !incident.resolved_at) return null
      const seconds = (Date.parse(incident.resolved_at) - Date.parse(start)) / 1000
      return Number.isFinite(seconds) ? seconds : null
    }
    default: return ''
  }
}

function compareIncidents(left, right, key) {
  if (key === 'severity') return compareSeverity(valueForSort(left, key), valueForSort(right, key))
  if (key === 'opened_at') {
    return compareDates(valueForSort(left, key), valueForSort(right, key))
  }
  if (key === 'resolution') {
    const leftDuration = valueForSort(left, key)
    const rightDuration = valueForSort(right, key)
    if (leftDuration === null && rightDuration === null) return 0
    if (leftDuration === null) return 1
    if (rightDuration === null) return -1
    return leftDuration - rightDuration
  }
  return compareText(valueForSort(left, key), valueForSort(right, key))
}

export default function IncidentsTable({ incidents, loading = false }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: 'opened_at', direction: 'desc' })
  const rows = Array.isArray(incidents) ? incidents : []
  const query = search.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!query) return rows
    return rows.filter(incident => searchableText(incident).includes(query))
  }, [query, rows])

  const sorted = useMemo(() => {
    const direction = sort.direction === 'asc' ? 1 : -1
    return [...filtered].sort((left, right) => {
      const primary = compareIncidents(left, right, sort.key) * direction
      if (primary !== 0) return primary
      return compareText(idOf(left), idOf(right))
    })
  }, [filtered, sort])

  const formatTime = value => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
  }

  const resolutionTime = incident => {
    const start = openedAt(incident)
    if (!start || !incident.resolved_at) return '—'
    const seconds = Math.max(0, Math.round((Date.parse(incident.resolved_at) - Date.parse(start)) / 1000))
    if (!Number.isFinite(seconds)) return '—'
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }

  const sortableHeader = (label, key, alignment = 'left') => {
    const active = sort.key === key
    const SortIcon = active ? (sort.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
    return (
      <th
        key={key}
        aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`px-4 py-2.5 ${alignment === 'right' ? 'text-right' : 'text-left'} font-medium`}
        scope="col"
      >
        <button
          type="button"
          onClick={() => setSort(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
          }))}
          className={`inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${alignment === 'right' ? 'flex-row-reverse' : ''}`}
          aria-label={`Sort by ${label}${active ? `, currently ${sort.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}
        >
          {label}
          <SortIcon aria-hidden="true" className={`size-3 ${active ? 'text-primary' : 'text-muted-foreground/50'}`} />
        </button>
      </th>
    )
  }

  return (
    <Panel className="mt-4">
      <PanelHeader
        title="Incident History"
        icon={ListFilter}
        className="flex-col items-stretch sm:flex-row sm:items-center"
        action={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <label className="relative block min-w-0 flex-1 sm:flex-initial">
              <span className="sr-only">Search incident history</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search incident history..."
                value={search}
                onChange={event => setSearch(event.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-8 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none sm:w-64"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Clear incident history search"
                  title="Clear search"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              )}
            </label>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="shrink-0 font-mono text-[10px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-sm">
          <thead>
            <tr className="border-y border-border font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {sortableHeader('Incident ID', 'id')}
              {sortableHeader('Incident Title', 'title')}
              {sortableHeader('Metric', 'metric')}
              {sortableHeader('Target', 'target')}
              {sortableHeader('Severity', 'severity')}
              {sortableHeader('Priority', 'priority')}
              {sortableHeader('Status', 'status')}
              {sortableHeader('Opened', 'opened_at')}
              {sortableHeader('Res. Time', 'resolution')}
              <th className="px-4 py-2.5 text-right font-medium" scope="col">Action</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {sorted.map((incident, index) => {
              const incidentId = idOf(incident)
              return (
                <tr key={incidentId || `incident-${index}`} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-3 font-mono text-muted-foreground">{incidentId || '—'}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{incident.title || incident.description || '—'}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{metricOf(incident) || '—'}</td>
                  <td className="px-4 py-3 text-foreground/80">{targetOf(incident) || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={String(incident.severity).toLowerCase() === 'critical' ? 'danger' : String(incident.severity).toLowerCase() === 'high' ? 'warning' : 'muted'}>
                      {incident.severity || '—'}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{incident.priority || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 font-mono text-foreground/80">
                      <Dot tone={['RESOLVED', 'CLOSED'].includes(String(incident.status).toUpperCase()) ? 'success' : 'muted'} />{incident.status || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{formatTime(openedAt(incident))}</td>
                  <td className="px-4 py-3 font-mono text-foreground/80">{resolutionTime(incident)}</td>
                  <td className="px-4 py-3 text-right text-accent hover:underline">
                    <button type="button" className="cursor-pointer">View Log</button>
                  </td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan="10" className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">
                  {loading ? 'Loading incident history…' : rows.length === 0 ? 'No incident history is available.' : 'No incidents match your search. Try another term or clear the search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
