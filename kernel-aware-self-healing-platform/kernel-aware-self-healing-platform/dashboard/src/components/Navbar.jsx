import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Settings, Search, CircleUser } from 'lucide-react'
import { Dot } from '@/components/kit'

export default function Navbar() {
  const [now, setNow] = useState(null)

  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const time = now
    ? now.toLocaleTimeString('en-GB', { hour12: false })
    : '--:--:--'
  const date = now
    ? now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold tracking-tight text-accent">Kernel</span>
        <span className="text-lg font-bold tracking-tight text-foreground">Sentinel</span>
        <span className="ml-1 text-lg font-bold text-primary">AI</span>
      </div>

      <div className="ml-6 hidden items-center gap-2 md:flex">
        <Dot tone="success" className="animate-pulse" />
        <span className="font-mono text-xs text-muted-foreground">
          System Status: <span className="text-primary">Optimal</span>
        </span>
      </div>

      <div className="ml-4 hidden font-mono text-xs text-muted-foreground lg:block">
        Last Sync: <span className="text-foreground">{time}</span>
        <span className="mx-3 text-border">|</span>
        {date}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Kernel Query..."
            className="h-9 w-56 rounded-md border border-input bg-card pl-9 pr-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          />
        </div>
        <button className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground cursor-pointer">
          <Bell className="size-4" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive" />
        </button>
        <Link to="/settings" className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground cursor-pointer">
          <Settings className="size-4" />
        </Link>
        <Link to="/settings" className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground cursor-pointer">
          <CircleUser className="size-4" />
        </Link>
      </div>
    </header>
  )
}
