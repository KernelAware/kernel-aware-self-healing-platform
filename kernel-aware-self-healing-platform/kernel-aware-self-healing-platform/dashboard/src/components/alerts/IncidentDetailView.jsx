import React from 'react'
import {
  TriangleAlert,
  Sparkles,
  CircleCheck,
  Lightbulb,
  Server,
  Activity,
  Brain,
  ShieldCheck,
  Clock
} from 'lucide-react'

import {
  Panel,
  PanelHeader,
  StatusBadge
} from '@/components/kit'


export default function IncidentDetailView({ timeline }) {
  return (
    <div className="flex flex-col gap-4 lg:col-span-2">

      {/* TOP SECTION */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* INCIDENT DETAILS & RESPONSE */}
        <Panel>

          <PanelHeader
            title="Incident Details & Response"
            icon={Activity}
            action={
              <span className="font-mono text-[10px] text-muted-foreground">
                Incident ID: INC-1042
              </span>
            }
          />


          <div className="p-4 pt-0">

            {/* INCIDENT HEADER */}
            <div className="border-b border-border pb-4">

              <div className="flex flex-wrap items-center gap-2">

                <h2 className="text-base font-semibold text-foreground">
                  High CPU Usage - nginx
                </h2>

                <span className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1 font-mono text-[10px] uppercase text-destructive">
                  P0 - Critical
                </span>

              </div>


              <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">

                <span className="flex items-center gap-1">
                  <Server className="size-3" />
                  server-01
                </span>

                <span>
                  nginx
                </span>

                <span>
                  PID 8842
                </span>

                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  Detected: 2m ago
                </span>

              </div>

            </div>


            {/* TRIGGER CONDITION */}
            <div className="mt-4 rounded-md border border-border bg-secondary/20">

              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <Activity className="size-4 text-accent" />

                <p className="text-xs font-medium text-foreground">
                  Trigger Condition
                </p>
              </div>


              <div className="grid grid-cols-2 gap-3 p-3 text-xs md:grid-cols-4">

                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Metric
                  </p>

                  <p className="mt-1 text-foreground">
                    CPU Usage (%)
                  </p>
                </div>


                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Current Value
                  </p>

                  <p className="mt-1 font-semibold text-destructive">
                    96.4%
                  </p>
                </div>


                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Threshold
                  </p>

                  <p className="mt-1 text-foreground">
                    &gt; 90%
                  </p>
                </div>


                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Duration
                  </p>

                  <p className="mt-1 text-foreground">
                    5 minutes
                  </p>
                </div>

              </div>

            </div>


            {/* DECISION ENGINE */}
            <div className="mt-3 rounded-md border border-border bg-secondary/20">

              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <Brain className="size-4 text-purple-400" />

                <p className="text-xs font-medium text-foreground">
                  Decision Engine
                </p>
              </div>


              <div className="grid grid-cols-1 gap-3 p-3 text-xs md:grid-cols-[1fr_1fr_2fr]">

                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Recommended Action
                  </p>

                  <p className="mt-1 font-semibold text-primary">
                    restart-service
                  </p>
                </div>


                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Decision
                  </p>

                  <p className="mt-1 text-foreground">
                    RESTART
                  </p>
                </div>


                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Reason
                  </p>

                  <p className="mt-1 text-muted-foreground">
                    CPU usage remained above the configured threshold
                    for 5 minutes.
                  </p>
                </div>

              </div>

            </div>


            {/* POLICY CHECK */}
            <div className="mt-3 rounded-md border border-border bg-secondary/20">

              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <ShieldCheck className="size-4 text-primary" />

                <p className="text-xs font-medium text-foreground">
                  Policy Check
                </p>
              </div>


              <div className="grid grid-cols-2 gap-3 p-3 text-xs md:grid-cols-4">

                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Rule Enabled
                  </p>

                  <p className="mt-1 font-semibold text-primary">
                    ✓ Yes
                  </p>
                </div>


                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Auto Execution
                  </p>

                  <p className="mt-1 font-semibold text-primary">
                    ✓ Yes
                  </p>
                </div>


                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Approval Required
                  </p>

                  <p className="mt-1 font-semibold text-warning">
                    ⚠ Required
                  </p>
                </div>


                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Cooldown Passed
                  </p>

                  <p className="mt-1 font-semibold text-primary">
                    ✓ Yes
                  </p>
                </div>

              </div>

            </div>

          </div>

        </Panel>

        {/* ROOT CAUSE ANALYSIS */}
        <Panel>

          <PanelHeader
            title="Incident Root Cause Analysis"
            icon={TriangleAlert}
            action={
              <div className="flex gap-2">
                <StatusBadge tone="success">
                  Verified
                </StatusBadge>

                <StatusBadge tone="info">
                  eBPF Telemetry
                </StatusBadge>
              </div>
            }
          />


          <div className="p-4 pt-0">

            <p className="mb-4 font-mono text-[11px] text-muted-foreground">
              Trace: IX-9942 (Kernel Thread Staleness)
            </p>


            <ol className="relative flex flex-col gap-4 border-l border-border pl-6">

              {timeline.map((t, i) => (

                <li
                  key={i}
                  className="relative"
                >

                  <span
                    className={`
                      absolute
                      -left-[27px]
                      top-1
                      flex
                      size-3
                      items-center
                      justify-center
                      rounded-full
                      ring-4
                      ring-card
                      ${
                        t.tone === 'danger'
                          ? 'bg-destructive'
                          : t.tone === 'success'
                            ? 'bg-primary'
                            : 'bg-accent'
                      }
                    `}
                  />


                  <div className="flex items-center justify-between">

                    <span
                      className={`
                        font-mono
                        text-xs
                        ${
                          t.tone === 'danger'
                            ? 'text-destructive'
                            : t.tone === 'success'
                              ? 'text-primary'
                              : 'text-accent'
                        }
                      `}
                    >
                      {t.time}
                    </span>


                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t.label}
                    </span>

                  </div>


                  <div className="mt-1.5 rounded-md border border-border bg-secondary/30 p-3">

                    <p className="font-mono text-xs text-foreground">
                      {t.title}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground text-pretty">
                      {t.note}
                    </p>

                  </div>

                </li>

              ))}

            </ol>

          </div>

        </Panel>

      </div>

      {/* OPERATOR ACTION REQUIRED */}
      <Panel>

        <PanelHeader
          title="Operator Action Required"
          icon={TriangleAlert}
        />


        <div className="p-4 pt-0">

          <p className="mb-4 text-xs text-muted-foreground">
            Review the recommendation and select an approved remediation action.
          </p>


          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

            <div>

              <label className="mb-2 block text-xs font-medium text-foreground">
                Select Remediation Action
              </label>


              <select
                className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-foreground outline-none focus:border-accent"
                defaultValue="restart-service"
              >

                <option value="restart-service">
                  restart-service (Recommended)
                </option>

                <option value="run-automation">
                  run-automation
                </option>

                <option value="send-notification">
                  send-notification
                </option>

              </select>


              <p className="mt-2 text-[11px] text-muted-foreground">
                Only actions allowed by this rule are shown.
              </p>

            </div>


            <div className="rounded-md border border-border bg-secondary/30 p-3">

              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Recommended Action
              </p>

              <p className="mt-1 font-mono text-sm text-primary">
                restart-service
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                <span className="text-foreground">
                  Reason:
                </span>{' '}
                CPU usage remained above the configured threshold for 5 minutes.
              </p>

            </div>

          </div>


          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

            <button className="rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90">
              Approve & Execute
            </button>


            <button className="rounded-md bg-destructive px-4 py-2.5 text-xs font-semibold text-destructive-foreground transition hover:opacity-90">
              Reject
            </button>

          </div>

        </div>

      </Panel>
    </div>
  )
}