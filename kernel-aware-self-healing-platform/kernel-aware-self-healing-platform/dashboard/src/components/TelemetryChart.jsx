import React from 'react'
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const colorMap = {
  primary: 'var(--primary)',
  accent: 'var(--accent)',
  warning: 'var(--warning)',
  destructive: 'var(--destructive)',
}

function resolve(color) {
  return colorMap[color] ?? color
}

export function TelemetryArea({ data, series, xKey = 'x', height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={resolve(s.color)} stopOpacity={0.35} />
              <stop offset="100%" stopColor={resolve(s.color)} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
          }}
          labelStyle={{ color: 'var(--muted-foreground)' }}
        />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={resolve(s.color)}
            strokeWidth={2}
            fill={`url(#grad-${s.key})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function TelemetryLine({ data, series, xKey = 'x', height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
          }}
          labelStyle={{ color: 'var(--muted-foreground)' }}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={resolve(s.color)}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
