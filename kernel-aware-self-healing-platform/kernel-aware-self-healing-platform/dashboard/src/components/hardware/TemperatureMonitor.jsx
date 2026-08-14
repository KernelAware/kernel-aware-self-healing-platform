import React from 'react'
import { Thermometer } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/kit'

// const temps = [42, 45, 41, 58, 62, 44, 43, 40, 39, 41, 46, 74, 42, 40, 41, 43]
// const bars = [30, 55, 42, 68, 35, 80, 48, 60, 38, 72, 50, 44, 66, 40, 58, 46, 78, 52, 62, 36, 70, 48, 54, 42]
//
// function tempTone(t) {
//   if (t >= 70) return { ring: 'border-destructive/50 bg-destructive/10', text: 'text-destructive' }
//   if (t >= 55) return { ring: 'border-warning/50 bg-warning/10', text: 'text-warning' }
//   return { ring: 'border-primary/30 bg-primary/5', text: 'text-primary' }
// }

export default function TemperatureMonitor() {
  return (
      <Panel className="lg:col-span-2">
          {/*<PanelHeader*/}
          {/*  title="CPU Core Temperatures"*/}
          {/*  icon={Thermometer}*/}
          {/*  action={<span className="font-mono text-xs text-muted-foreground">AVG: 42°C</span>}*/}
          {/*/>*/}
          {/*<div className="grid grid-cols-4 gap-2 p-4 pt-0 sm:grid-cols-8">*/}
          {/*  {temps.map((t, i) => {*/}
          {/*    const tone = tempTone(t)*/}
          {/*    return (*/}
          {/*      <div key={i} className={`flex flex-col items-center gap-1 rounded-md border py-3 ${tone.ring}`}>*/}
          {/*        <span className="font-mono text-[10px] text-muted-foreground">C{i}</span>*/}
          {/*        <span className={`font-mono text-sm font-semibold ${tone.text}`}>{t}°</span>*/}
          {/*      </div>*/}
          {/*    )*/}
          {/*  })}*/}
          {/*</div>*/}
          {/*<div className="px-4 pb-4">*/}
          {/*  <div className="flex h-24 items-end gap-1 rounded-md bg-secondary/30 p-3">*/}
          {/*    {bars.map((b, i) => (*/}
          {/*      <div key={i} className="flex-1 rounded-sm bg-primary/60" style={{ height: `${b}%` }} />*/}
          {/*    ))}*/}
          {/*  </div>*/}
          {/*  <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">*/}
          {/*    Thermal Frequency Telemetry*/}
          {/*  </p>*/}
          {/*</div>*/}
          <iframe
              src="http://localhost:3000/d-solo/adkfxpq/core-temparature?orgId=1&from=now-5m&to=now&refresh=5s&showCategory=Panel%20links&panelId=panel-1"
              width="900" height="200" frameBorder="0"></iframe>

          <iframe
              src="http://localhost:3000/d-solo/adkfxpq/core-temparature?orgId=1&from=now-5m&to=now&refresh=5s&showCategory=Panel%20links&panelId=panel-2"
              width="900" height="200" frameBorder="0"></iframe>

      </Panel>
  )
}
