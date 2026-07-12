import React, { useEffect, useState } from 'react'
import { Dot } from '@/components/kit'

export default function StatusFooter() {
  const [time, setTime] = useState('--:--:--')

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString('en-GB', { hour12: false }) +
          '.' +
          String(new Date().getMilliseconds()).padStart(3, '0'),
      )
    tick()
    const t = setInterval(tick, 200)
    return () => clearInterval(t)
  }, [])

  return (
    <footer className="flex h-9 shrink-0 items-center gap-4 border-t border-border bg-background px-6 font-mono text-[11px] text-muted-foreground">
      <span>
        SYS_TIME: <span className="text-foreground/80">{time}</span>
      </span>
      <span className="hidden sm:inline">
        KERNEL_REL: <span className="text-foreground/80">6.5.0-sentinel-x86</span>
      </span>
      <span className="hidden md:inline text-primary">HEALER_ACTIVE: TRUE</span>
      <div className="ml-auto flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <Dot tone="success" /> AGENT_UP
        </span>
        <span className="flex items-center gap-1.5">
          <Dot tone="info" /> CLUSTER_SYNC
        </span>
      </div>
    </footer>
  )
}
