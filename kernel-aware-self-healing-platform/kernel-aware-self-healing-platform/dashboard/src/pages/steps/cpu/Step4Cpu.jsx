import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"

export const CPU_METRICS = [
  { label: "Overall CPU Usage", value: "cpu_usage_percent", unit: "%", min: 0, max: 100 },
  { label: "1-Minute Load Average", value: "cpu_load_1min", unit: "load", min: 0 },
  { label: "Per-Core CPU Usage", value: "cpu_core_usage_percent", unit: "%", min: 0, max: 100 },
  { label: "5-Minute Load Average", value: "cpu_load_5min", unit: "load", min: 0 },
  { label: "15-Minute Load Average", value: "cpu_load_15min", unit: "load", min: 0 },
  { label: "Current CPU Frequency", value: "cpu_freq_current_mhz", unit: "MHz", min: 0 },
  { label: "CPU User Time", value: "cpu_times_user", unit: "%", min: 0, max: 100 },
  { label: "CPU System Time", value: "cpu_times_system", unit: "%", min: 0, max: 100 },
  { label: "CPU I/O Wait", value: "cpu_times_iowait", unit: "%", min: 0, max: 100 },
  { label: "CPU Steal Time", value: "cpu_times_steal", unit: "%", min: 0, max: 100 },
  { label: "Context Switches", value: "cpu_ctx_switches", unit: "", min: 0 },
]

const TARGET_TYPES = [
  { label: "Host", value: "host" },
  { label: "Process", value: "process" },
  { label: "Services", value: "services" },
  { label: "Container", value: "container" },
]

export default function Step4Cpu({ form, setForm }) {
  const selectedMetric = CPU_METRICS.find(metric => metric.value === form.metric)

  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">4. Target & Metric</p><p className="text-xs text-muted-foreground mt-0.5">Select the metric and target for this rule.</p></div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <div><label className="block font-mono text-[11px] text-foreground mb-1.5">CPU Metric <span className="text-destructive">*</span></label><SelectBox value={form.metric} options={CPU_METRICS} onChange={v => setForm(f => ({ ...f, metric: v, condMetric: v }))} /></div>
          <div><label className="block font-mono text-[11px] text-foreground mb-1.5">Target Type <span className="text-destructive">*</span></label><SelectBox value={form.targetType} options={TARGET_TYPES} onChange={v => setForm(f => ({ ...f, targetType: v }))} /></div>
          <div><label className="block font-mono text-[11px] text-foreground mb-1.5">Host <span className="text-destructive">*</span></label><SelectBox value={form.host} options={["web-01.prod.local","web-02.prod.local","app-01.prod.local"]} onChange={v => setForm(f => ({ ...f, host: v }))} /></div>
        </div>
        <div className="col-span-1">
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4 h-full">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary mb-2">About {selectedMetric?.label || "CPU Metric"}</p>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              Select the CPU metric to evaluate on the selected target.
            </p>
          </div>
        </div>
      </div>
    </Panel>
  )
}
