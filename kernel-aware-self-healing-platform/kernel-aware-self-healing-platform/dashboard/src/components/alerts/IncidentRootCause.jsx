import React from 'react'
import { TriangleAlert } from 'lucide-react'

import {
  Panel,
  PanelHeader,
  StatusBadge
} from '@/components/kit'


export default function IncidentRootCause({ timeline }) {
  return (
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

          {(timeline || []).map((t, i) => (

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
  )
}