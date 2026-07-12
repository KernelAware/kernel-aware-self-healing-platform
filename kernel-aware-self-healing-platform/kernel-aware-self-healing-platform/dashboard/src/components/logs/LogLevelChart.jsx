import React from 'react'

export default function LogLevelChart() {
  return (
    <div className="mb-5">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Severity Distribution</p>
      <div className="mb-2 flex h-2 overflow-hidden rounded-full bg-secondary">
        <div className="bg-primary" style={{ width: '73%' }} />
        <div className="bg-warning" style={{ width: '19%' }} />
        <div className="bg-destructive" style={{ width: '8%' }} />
      </div>
      <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
        <span>INFO: 4.2k</span>
        <span>WARN: 1.1k</span>
        <span>ERROR: 402</span>
      </div>
    </div>
  )
}
