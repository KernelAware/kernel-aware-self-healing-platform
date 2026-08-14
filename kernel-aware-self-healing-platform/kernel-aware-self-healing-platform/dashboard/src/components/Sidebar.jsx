import React, { useState } from 'react'
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
  Settings,
  FileCog,
  Monitor,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/utils/cn'

const systemMonitoringChildren = [
  { label: 'CPU & Performance', href: '/cpu', icon: Cpu },
  { label: 'Memory & Disk', href: '/memory', icon: HardDrive },
  { label: 'Hardware Health', href: '/hardware', icon: CircuitBoard },
  { label: 'Network', href: '/network', icon: Network },
  { label: 'Processes & Services', href: '/processes', icon: SquareTerminal },
  { label: 'Logs Viewer', href: '/logs', icon: ScrollText },
]

const mainNav = [
  { label: 'Overview', href: '/', icon: LayoutGrid },
  {
    label: 'System Monitoring',
    icon: Monitor,
    children: systemMonitoringChildren,
  },
  { label: 'Alerts & Incidents', href: '/alerts', icon: TriangleAlert },
  { label: 'Self-Healing Status', href: '/self-healing', icon: WandSparkles },
  { label: 'Policy & Rules Engine', href: '/policy', icon: FileCog },
  { label: 'System Settings', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const location = useLocation()
  const pathname = location.pathname
  const [hovering, setHovering] = useState(false)

  const systemMonitoringActive = systemMonitoringChildren.some(c =>
    pathname.startsWith(c.href)
  )

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
            if (item.children) {
              return (
                <li key={item.label} className="relative"
                  onMouseEnter={() => setHovering(true)}
                  onMouseLeave={() => setHovering(false)}
                >
                  {/* Parent button */}
                  <div className={cn(
                    'group flex items-center gap-3 rounded-md px-3 py-2 font-mono text-[13px] transition-colors cursor-pointer select-none',
                    systemMonitoringActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  )}>
                    <item.icon className={cn(
                      'size-4 shrink-0',
                      systemMonitoringActive ? 'text-sidebar-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground',
                    )} />
                    <span className="truncate flex-1">{item.label}</span>
                    <ChevronRight className={cn(
                      'size-3.5 shrink-0 transition-transform duration-200',
                      hovering ? 'rotate-90' : '',
                      systemMonitoringActive ? 'text-sidebar-primary' : 'text-muted-foreground'
                    )} />
                    {systemMonitoringActive && !hovering && (
                      <span className="ml-auto h-4 w-1 rounded-full bg-sidebar-primary" />
                    )}
                  </div>

                  {/* Dropdown children — shown on hover */}
                  <div className={cn(
                    'overflow-hidden transition-all duration-200 ease-in-out',
                    hovering ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  )}>
                    <ul className="mt-1 ml-3 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
                      {item.children.map((child) => {
                        const childActive = pathname.startsWith(child.href)
                        const ChildIcon = child.icon
                        return (
                          <li key={child.label}>
                            <Link
                              to={child.href}
                              className={cn(
                                'group flex items-center gap-2.5 rounded-md px-2 py-1.5 font-mono text-[12px] transition-colors',
                                childActive
                                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                  : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                              )}
                            >
                              <ChildIcon className={cn(
                                'size-3.5 shrink-0',
                                childActive ? 'text-sidebar-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground',
                              )} />
                              <span className="truncate">{child.label}</span>
                              {childActive && (
                                <span className="ml-auto h-3 w-1 rounded-full bg-sidebar-primary" />
                              )}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </li>
              )
            }

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
