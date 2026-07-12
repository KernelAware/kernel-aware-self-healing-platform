import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutGrid,
  Cpu,
  HardDrive,
  CircuitBoard,
  Network,
  SquareTerminal,
  TriangleAlert,
  WandSparkles,
  ScrollText,
  ShieldCheck,
  FileText,
  Settings
} from 'lucide-react'
import { cn } from '@/utils/cn'

const mainNav = [
  { label: 'Overview', href: '/', icon: LayoutGrid },
  { label: 'CPU & Performance', href: '/cpu', icon: Cpu },
  { label: 'Memory & Disk', href: '/memory', icon: HardDrive },
  { label: 'Hardware Health', href: '/hardware', icon: CircuitBoard },
  { label: 'Network', href: '/network', icon: Network },
  { label: 'Processes & Services', href: '/processes', icon: SquareTerminal },
  { label: 'Alerts & Incidents', href: '/alerts', icon: TriangleAlert },
  { label: 'Self-Healing Status', href: '/self-healing', icon: WandSparkles },
  { label: 'Logs Viewer', href: '/logs', icon: ScrollText },
  { label: 'System Settings', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const location = useLocation()
  const pathname = location.pathname

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-md bg-sidebar-primary/15 text-sidebar-primary">
          <SquareTerminal className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Autonomous Shell</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            v.4.2.0-alpha
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {mainNav.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <li key={item.label}>
                <Link
                  to={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-md px-3 py-2 font-mono text-[13px] transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-4 shrink-0',
                      active ? 'text-sidebar-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground',
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                  {active && (
                    <span className="ml-auto h-4 w-1 rounded-full bg-sidebar-primary" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-3 py-4">
        <div className="mb-3 flex items-center gap-3 rounded-md px-3 py-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-primary">
            <span className="font-mono text-xs">OP</span>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium">Operator</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Level 4 Access
            </p>
          </div>
        </div>
        <ul className="flex flex-col gap-1">
          <li>
            <Link 
              to="/" 
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 font-mono text-[13px] text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <ShieldCheck className="size-4" />
              Security Audit
            </Link>
          </li>
          <li>
            <Link 
              to="/logs" 
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 font-mono text-[13px] text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <FileText className="size-4" />
              System Logs
            </Link>
          </li>
        </ul>
      </div>
    </aside>
  )
}
