import React, { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ListFilter, Search, X } from 'lucide-react'
import { Panel, PanelHeader, StatusBadge } from '@/components/kit'

const SEVERITY_ORDER = ['warning', 'high', 'critical']

const openedAt = incident => incident.opened_at || incident.created_at || incident.detected_at || incident.start
const metricOf = incident => incident.metric || incident.trigger?.metric || incident.violated_metric?.metric || incident.detail?.trigger?.metric || incident.detail?.violated_metric?.metric || incident.alert?.metric
const targetOf = incident => incident.target || incident.process || incident.alert?.target

function unitForMetric(metric) {
  const name = String(metric || '').trim().toLowerCase()
  if (/(?:_percent(?:age)?|\s*\(%\))$/.test(name)) return '%'
  if (/_bytes?$/.test(name)) return 'bytes'
  if (/_gb$/.test(name)) return 'GB'
  if (/_speed_mb$|_mb_per_second$/.test(name)) return 'MB/s'
  if (/_ms$/.test(name)) return 'ms'
  if (/_celsius$/.test(name)) return '°C'
  if (/_seconds?$/.test(name)) return 'seconds'
  if (/_hours?$/.test(name)) return 'hours'
  if (/_iops$/.test(name)) return 'IOPS'
  if (/_rpm$/.test(name)) return 'RPM'
  if (/_count$/.test(name)) return 'operations'
  if (/_health$|_charging$/.test(name)) return '0/1'
  return ''
}

function violatedMetricCondition(incident) {
  const trigger = incident.trigger || incident.detail?.trigger || {}
  const violatedMetric = incident.violated_metric || incident.detail?.violated_metric || {}
  const metric = metricOf(incident)
  const operator = trigger.operator || violatedMetric.operator || incident.operator || incident.alert?.operator
  const threshold = trigger.threshold ?? violatedMetric.threshold ?? incident.threshold ?? incident.alert?.threshold
  const unit = trigger.unit || violatedMetric.unit || incident.detail?.trigger?.unit || incident.detail?.violated_metric?.unit || incident.unit || incident.alert?.unit || unitForMetric(metric)
  const symbol = String(operator || '').match(/(?:>=|<=|==|>|<|=)/)?.[0]
  const numericThreshold = threshold === null || threshold === undefined || String(threshold).trim() === ''
    ? null
    : Number(threshold)

  if (!metric || String(metric).toLowerCase() === 'unknown metric' || !symbol || !unit || !Number.isFinite(numericThreshold)) {
    return 'Condition unavailable'
  }

  const formattedUnit = ['%', 'percent', 'percentage'].includes(String(unit).trim().toLowerCase()) ? '%' : ` ${unit}`
  return `${metric} ${symbol} ${String(numericThreshold)}${formattedUnit}`
}

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
    Object.entries(value).forEach(([key, item]) => {
      if (['id', 'incident_id', 'metric'].includes(key)) return
      collectSearchText(item, output)
    })
  }
}

function searchableText(incident) {
  const values = []
  collectSearchText([
    incident.rule_id,
    violatedMetricCondition(incident),
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
    case 'title': return incident.title || incident.description
    case 'condition': return violatedMetricCondition(incident)
    case 'target': return targetOf(incident)
    case 'severity': return incident.severity
    case 'priority': return incident.priority
    case 'opened_at': return openedAt(incident)
    default: return ''
  }
}

function compareIncidents(left, right, key) {
  if (key === 'severity') return compareSeverity(valueForSort(left, key), valueForSort(right, key))
  if (key === 'opened_at') {
    return compareDates(valueForSort(left, key), valueForSort(right, key))
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
    return filtered
      .map((incident, index) => ({ incident, index }))
      .sort((left, right) => {
        const primary = compareIncidents(left.incident, right.incident, sort.key) * direction
        return primary || left.index - right.index
      })
      .map(({ incident }) => incident)
  }, [filtered, sort])

  const formatTime = value => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
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
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-y border-border font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {sortableHeader('Incident Title', 'title')}
              {sortableHeader('Violated Metric', 'condition')}
              {sortableHeader('Target', 'target')}
              {sortableHeader('Severity', 'severity')}
              {sortableHeader('Priority', 'priority')}
              {sortableHeader('Opened', 'opened_at')}
              <th className="px-4 py-2.5 text-right font-medium" scope="col">Action</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {sorted.map((incident, index) => {
              const incidentKey = incident.incident_id || incident.id || `incident-${index}`
              return (
                <tr key={incidentKey} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-3 font-medium text-foreground">{incident.title || incident.description || '—'}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{violatedMetricCondition(incident)}</td>
                  <td className="px-4 py-3 text-foreground/80">{targetOf(incident) || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={String(incident.severity).toLowerCase() === 'critical' ? 'danger' : String(incident.severity).toLowerCase() === 'high' ? 'warning' : 'muted'}>
                      {incident.severity || '—'}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{incident.priority || '—'}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{formatTime(openedAt(incident))}</td>
                  <td className="px-4 py-3 text-right text-accent hover:underline">
                    <button type="button" className="cursor-pointer">View Log</button>
                  </td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">
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
