import React from 'react'

const SOURCES = ['Kernel eBPF', 'Systemd Service', 'Container Runtime', 'Auth.log']
const SEV_STYLE = {
  INFO: 'bg-primary/15 text-primary',
  WARN: 'bg-warning/15 text-warning',
  ERROR: 'bg-destructive/15 text-destructive',
  DEBUG: 'bg-accent/15 text-accent',
}

export default function LogFilter({ active, sources, toggleSev, toggleSrc, resetAll }) {
  return (
    <div className="h-fit">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-mono text-sm tracking-wider text-foreground">Log Filters</h3>
        <button
          onClick={resetAll}
          className="font-mono text-[11px] text-primary hover:underline cursor-pointer"
        >
          RESET ALL
        </button>
      </div>

      <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Log Source</p>
      <div className="mb-5 space-y-2">
        {SOURCES.map((s) => (
          <label key={s} className="flex cursor-pointer items-center gap-2 text-sm text-foreground select-none">
            <input
              type="checkbox"
              checked={sources.includes(s)}
              onChange={() => toggleSrc(s)}
              className="size-4 rounded border-border accent-primary cursor-pointer"
            />
            {s}
          </label>
        ))}
      </div>

      <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Severity Level</p>
      <div className="grid grid-cols-2 gap-2">
        {['INFO', 'WARN', 'ERROR', 'DEBUG'].map((s) => (
          <button
            key={s}
            onClick={() => toggleSev(s)}
            className={`rounded-md border px-3 py-2 font-mono text-xs transition-colors cursor-pointer ${
              active.includes(s)
                ? SEV_STYLE[s] + ' border-transparent'
                : 'border-border text-muted-foreground'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-3">
        <p className="mb-1 font-mono text-xs text-primary">Loki Sync Active</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Autonomous pattern recognition is running on historical data (24h backfill).
        </p>
      </div>
    </div>
  )
}
