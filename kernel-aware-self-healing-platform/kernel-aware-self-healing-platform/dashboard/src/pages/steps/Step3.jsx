import { Panel } from "@/components/kit"
import { cn } from "@/utils/cn"
import { Radio } from "./wizardComponents"
import { MONITOR_SOURCES } from "./wizardConstants"

export default function Step3({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">3. Monitor (Data Source)</p><p className="text-xs text-muted-foreground mt-0.5">What do you want to monitor?</p></div>
      <div className="grid grid-cols-2 gap-3">
        {MONITOR_SOURCES.map(src => { const Icon = src.icon; const sel = form.monitorSource === src.id; return (
          <label key={src.id} onClick={() => setForm(f => {
              if (f.monitorSource === src.id) return f;
              const base = { ...f, monitorSource: src.id };
              if (src.id === "network") {
                return { ...base, metric: "Network Error Rate (Incoming)", targetType: "Network Interface", aggregation: "Average (60s)", condMetric: "Error Rate (errors/sec)", condThreshold: "", recoveryThreshold: "", condInterval: "Every 20 seconds", actionType: "alert" };
              } else if (src.id === "cpu") {
                return { ...base, metric: "CPU Usage", targetType: "Host", aggregation: "Average (Avg)", condMetric: "CPU Usage (%)", condThreshold: "", recoveryThreshold: "", condInterval: "Every 30 seconds", actionType: "create-incident" };
              }
              return base;
            })}
            className={cn("flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors", sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
            <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", src.cls)}><Icon className="size-4" /></div>
            <div className="flex-1 min-w-0"><p className="font-mono text-xs font-semibold text-foreground">{src.title}</p><p className="font-mono text-[10px] text-muted-foreground">{src.desc}</p></div>
            <Radio checked={sel} />
          </label>
        )})}
      </div>
    </Panel>
  )
}
