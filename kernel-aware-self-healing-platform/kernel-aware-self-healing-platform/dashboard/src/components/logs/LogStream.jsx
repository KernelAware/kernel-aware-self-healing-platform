import React from 'react'
import { Play, Pause, Copy, Download } from 'lucide-react'
import { StatusBadge, ActionButton } from '@/components/kit'
import { api } from '@/services/api'

const SEV_STYLE = {
  INFO: 'bg-primary/15 text-primary',
  WARN: 'bg-warning/15 text-warning',
  ERROR: 'bg-destructive/15 text-destructive',
  DEBUG: 'bg-accent/15 text-accent',
}

const TAG_STYLE = {
  kernel: 'text-accent',
  'sentinel-daemon': 'text-primary',
  memory: 'text-warning',
  'self-healing': 'text-primary',
  docker: 'text-destructive',
  audit: 'text-muted-foreground',
  network: 'text-accent',
  postgres: 'text-destructive',
}

export default function LogStream({ logs, live, setLive }) {
  const copyLogs = () => {
    const text = logs.map(l => `[2023-10-24 ${l.time}] ${l.sev} ${l.tag}: ${l.msg}`).join('\n')
    navigator.clipboard.writeText(text)
  }

  const exportLogs = async () => {
    await api.exportLogs('txt')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-destructive/70" />
          <span className="size-3 rounded-full bg-warning/70" />
          <span className="size-3 rounded-full bg-primary/70" />
          <span className="ml-3 font-mono text-xs text-muted-foreground">terminal — logs_stream_main.sh</span>
        </div>
        <div className="flex items-center gap-1">
          <StatusBadge tone={live ? 'success' : 'muted'}>{live ? 'Live' : 'Paused'}</StatusBadge>
          <button
            onClick={() => setLive((v) => !v)}
            className="p-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label={live ? 'Pause stream' : 'Resume stream'}
          >
            {live ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <button 
            onClick={copyLogs}
            className="p-1.5 text-muted-foreground hover:text-foreground cursor-pointer" 
            aria-label="Copy logs"
          >
            <Copy className="size-4" />
          </button>
        </div>
      </div>

      <div className="max-h-[560px] overflow-auto p-4 font-mono text-[13px] leading-relaxed flex-1">
        {logs.map((l, i) => (
          <div key={i} className="py-0.5">
            <span className="text-muted-foreground">[2023-10-24 {l.time}]</span>{' '}
            <span className={`rounded px-1 text-[11px] ${SEV_STYLE[l.sev]}`}>{l.sev}</span>{' '}
            <span className={TAG_STYLE[l.tag] ?? 'text-foreground'}>{l.tag}:</span>{' '}
            <span className="text-foreground/90">{l.msg}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <span className="font-mono text-[11px] text-muted-foreground">PRESS [ESC] TO CLEAR TERMINAL</span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-muted-foreground">
            <span className="text-primary">●</span> {logs.length} Messages Received
          </span>
          <ActionButton 
            onClick={exportLogs}
            icon={Download} 
            className="h-8 cursor-pointer"
          >
            Export Logs
          </ActionButton>
        </div>
      </div>
    </div>
  )
}
