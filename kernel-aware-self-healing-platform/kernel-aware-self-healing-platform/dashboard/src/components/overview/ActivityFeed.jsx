import React from 'react'
import { SquareTerminal } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/kit'

const activity = [
  { time: '14:05:12', tag: 'eBPF_PROBE', tone: 'success', text: 'eBPF Probe active on node-04. Intercepting syscall: execve()' },
  { time: '14:04:48', tag: 'SELF_HEAL', tone: 'warning', text: 'Self-healing: Restarted nginx on node-12. Reason: Hung process detected' },
  { time: '14:04:22', tag: 'KERNEL_EV', tone: 'info', text: 'TCP Retransmission spike detected on eth0 (node-08)' },
  { time: '14:03:55', tag: 'SYSTEM_LOG', tone: 'muted', text: 'Cron job [daily_cleanup] completed successfully in 0.4s' },
  { time: '14:03:10', tag: 'eBPF_PROBE', tone: 'success', text: 'New network profile generated for svc-billing-api' },
  { time: '14:02:45', tag: 'KERNEL_EV', tone: 'info', text: 'Memory pressure event in cgroup: /user.slice/user-1000.slice' },
]

export default function ActivityFeed() {
  return (
    <Panel className="lg:col-span-2">
      <PanelHeader
        title="Live System Activity Feed"
        icon={SquareTerminal}
        action={
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary" />eBPF</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-accent" />Kernel</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-warning" />Auto-Heal</span>
          </div>
        }
      />
      <ul className="flex flex-col gap-2 p-4 pt-0">
        {activity.map((e, i) => (
          <li
            key={i}
            data-tone={e.tone}
            className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded-md border-l-2 bg-secondary/40 py-2 pl-3 pr-3 font-mono text-xs data-[tone=info]:border-accent data-[tone=muted]:border-border data-[tone=success]:border-primary data-[tone=warning]:border-warning"
          >
            <span className="text-muted-foreground">[{e.time}]</span>
            <span
              className={
                e.tone === 'success'
                  ? 'text-primary'
                  : e.tone === 'warning'
                    ? 'text-warning'
                    : e.tone === 'info'
                      ? 'text-accent'
                      : 'text-muted-foreground'
              }
            >
              {e.tag}
            </span>
            <span className="text-foreground/80">{e.text}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
