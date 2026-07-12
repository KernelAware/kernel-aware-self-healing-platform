import React from 'react'
import { cn } from '@/utils/cn'

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 font-mono text-xs uppercase tracking-widest text-primary">{eyebrow}</p>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground text-pretty">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function ActionButton({ children, variant = 'default', icon: Icon, className, ...props }) {
  const variants = {
    default: 'border border-border bg-card text-foreground hover:bg-secondary',
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-primary',
    ghost: 'text-muted-foreground hover:bg-card hover:text-foreground',
  }
  return (
    <button
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-md px-3.5 font-mono text-xs font-medium tracking-wide transition-colors cursor-pointer',
        variants[variant],
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="size-3.5" />}
      {children}
    </button>
  )
}

const toneText = {
  success: 'text-primary',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-accent',
  neutral: 'text-foreground',
}

const toneBar = {
  success: 'bg-primary',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-accent',
  neutral: 'bg-muted-foreground',
}

export function StatCard({ label, value, unit, hint, tone = 'neutral', icon: Icon, className }) {
  return (
    <div className={cn('rounded-lg border border-border bg-card p-4', className)}>
      <div className="flex items-start justify-between">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        {Icon && <Icon className={cn('size-4', toneText[tone])} />}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={cn('text-3xl font-bold tracking-tight', toneText[tone])}>{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

export function ProgressBar({ value, tone = 'success', className }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-secondary', className)}>
      <div
        className={cn('h-full rounded-full transition-all', toneBar[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export function CircularGauge({ value, label, size = 150, tone = 'success' }) {
  const stroke = 10
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - (value / 100) * circ
  const colorVar = {
    success: 'var(--primary)',
    warning: 'var(--warning)',
    danger: 'var(--destructive)',
    info: 'var(--accent)',
    neutral: 'var(--muted-foreground)',
  }
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--secondary)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colorVar[tone]}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn('text-2xl font-bold', toneText[tone])}>{value}%</span>
        {label && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {label}
          </span>
        )}
      </div>
    </div>
  )
}

export function Panel({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card text-card-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function PanelHeader({ title, icon: Icon, action, className }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-4 py-3', className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-4 text-primary" />}
        <h3 className="font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
      </div>
      {action}
    </div>
  )
}

const toneClasses = {
  success: 'bg-primary/12 text-primary border-primary/30',
  warning: 'bg-warning/12 text-warning border-warning/30',
  danger: 'bg-destructive/12 text-destructive border-destructive/30',
  info: 'bg-accent/15 text-accent border-accent/30',
  muted: 'bg-muted text-muted-foreground border-border',
}

export function StatusBadge({ tone = 'muted', children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Dot({ tone = 'muted', className }) {
  const map = {
    success: 'bg-primary',
    warning: 'bg-warning',
    danger: 'bg-destructive',
    info: 'bg-accent',
    muted: 'bg-muted-foreground',
  }
  return <span className={cn('inline-block size-2 rounded-full', map[tone], className)} />
}
