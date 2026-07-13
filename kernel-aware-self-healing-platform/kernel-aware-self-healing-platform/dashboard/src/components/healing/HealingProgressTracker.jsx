import React from 'react'
import { WandSparkles, Search, ListTodo, Zap, BadgeCheck } from 'lucide-react'
import { Panel, PanelHeader, StatusBadge } from '@/components/kit'

const steps = [
  { icon: Search, label: 'ANALYZING', sub: 'Completed 14:01:02', state: 'done' },
  { icon: ListTodo, label: 'REMEDIATION', sub: 'Completed 14:01:15', state: 'done' },
  { icon: Zap, label: 'EXECUTING', sub: 'In Progress...', state: 'active' },
  { icon: BadgeCheck, label: 'VERIFYING', sub: 'Pending', state: 'pending' },
]

const logLines = [
  { time: '14:01:02', text: "Anomaly detected in Kernel Namespace 'net-stack-01'. High TCP Retransmission." },
  { time: '14:01:15', text: "Policy matched: 'AUTONOMOUS_NET_HEAL'. Selected Action: 'RESET_INTERFACE_TX_QUEUE'." },
  { time: '14:01:18', text: "Executing ansible playbook: 'system-network-reset.yml' on host node-v42..." },
  { time: '14:02:11', text: 'Waiting for kernel telemetry feedback loop...' },
]

export default function HealingProgressTracker() {
  return (
    <Panel className="lg:col-span-2">
      <PanelHeader title="Active Healing Operation · ID: CORE-RECOVERY-X920" icon={WandSparkles} action={<StatusBadge tone="success">Executing</StatusBadge>} />
      <div className="p-6 pt-4">
        {/* Step Tracker Container */}
        <div className="relative flex justify-between items-start mb-8 w-full">
          {/* Horizontal Line behind icons */}
          <div className="absolute left-[12.5%] right-[12.5%] top-[24px] h-[2px] bg-secondary -translate-y-1/2">
            {/* Completed/Green Line segment */}
            <div className="h-full bg-primary" style={{ width: '66.66%' }} />
          </div>

          {/* Steps */}
          {steps.map((s) => {
            const Icon = s.icon
            const isDone = s.state === 'done'
            const isActive = s.state === 'active'
            const isPending = s.state === 'pending'

            return (
              <div key={s.label} className="relative z-10 flex flex-col items-center flex-1">
                {/* Icon Container */}
                <div className={`flex size-12 items-center justify-center rounded-2xl border transition-all duration-300 ${
                  isDone 
                    ? 'bg-primary border-primary text-primary-foreground shadow-glow-primary' 
                    : isActive 
                      ? 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20 shadow-glow-primary animate-pulse' 
                      : 'bg-card border-border text-muted-foreground'
                }`}>
                  <Icon className="size-5" />
                </div>

                {/* Text Labels below */}
                <p className={`mt-4 font-mono text-xs font-semibold tracking-wider ${
                  isPending ? 'text-muted-foreground/70' : 'text-primary'
                }`}>
                  {s.label}
                </p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {s.sub}
                </p>
              </div>
            )
          })}
        </div>

        {/* Logs terminal */}
        <div className="mt-6 rounded-md border border-border bg-background p-4 font-mono text-xs">
          {logLines.map((l, i) => (
            <p key={i} className="py-0.5">
              <span className="text-primary">[{l.time}]</span>{' '}
              <span className="text-foreground/80">{l.text}</span>
            </p>
          ))}
        </div>
      </div>
    </Panel>
  )
}
