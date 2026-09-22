import { useEffect } from "react"
import { Panel } from "@/components/kit"
import { SelectBox } from "./wizardComponents"
import { Info } from "lucide-react"
import Step10Process from "./process/step10process.jsx"
import { DISK_METRICS, OPERATORS, metricFor, updateDisk } from "./disk/diskHelpers"

export default function Step10({ form, setForm }) {
  if (form.monitorSource === "disk") return <DiskRecovery form={form} setForm={setForm} />
  const isNetwork = form.monitorSource === "network";
  const condUnit = isNetwork ? "errors/sec" : "%";

  if (form.monitorSource === "process") return <Step10Process form={form} setForm={setForm} />
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">10. Verification & Recovery</p><p className="text-xs text-muted-foreground mt-0.5">How recovery is detected for this rule.</p></div>
      <div className="space-y-5">
        <div className="flex gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
          <Info className="size-4 text-primary shrink-0 mt-0.5" />
          <p className="font-mono text-[11px] text-foreground">Verification is not required for Alert-only actions.<br />Set recovery condition to auto-resolve incidents.</p>
        </div>
        <div>
          <label className="block font-mono text-xs font-semibold text-foreground mb-2">Recovery Condition</label>
          <div className="flex items-center gap-2 flex-wrap">
            <SelectBox value={isNetwork ? "Error Rate (errors/sec)" : "CPU Usage (%)"} options={isNetwork ? ["Error Rate (errors/sec)", "Packet Loss (%)"] : ["CPU Usage (%)","Memory Usage (%)"]} onChange={() => {}} className="flex-1 min-w-[140px]" />
            <SelectBox value="Less Than (<)" options={["Less Than (<)","Greater Than (>)"]} onChange={() => {}} className="w-36" />
            <input type="number" value={form.recoveryThreshold} onChange={e => setForm(f => ({ ...f, recoveryThreshold: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
            <span className="font-mono text-xs text-muted-foreground">{condUnit}</span>
          </div>
        </div>
        <div>
          <label className="block font-mono text-xs font-semibold text-foreground mb-2">Duration</label>
          <div className="flex items-center gap-2">
            <input type="number" value={form.recoveryDuration} onChange={e => setForm(f => ({ ...f, recoveryDuration: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
            <SelectBox value="Minutes" options={["Seconds","Minutes"]} onChange={() => {}} className="w-28" />
          </div>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">Condition must be met for the duration, the incident is marked as recovered.</p>
        </div>
      </div>
    </Panel>
  )
}

function DiskRecovery({ form, setForm }) {
  const metric = metricFor(form.recoveryMetric || form.metric)
  useEffect(() => {
    if (form.recoveryThreshold && form.recoveryDuration) return
    const defaultThreshold = metric.unit === "%" ? "80" : metric.unit === "ms" ? "50" : metric.unit === "IOPS" ? "1000" : "20"
    setForm(current => ({
      ...current,
      recoveryMetric: current.recoveryMetric || current.metric || metric.id,
      recoveryOperator: current.recoveryOperator || "Less Than (<)",
      recoveryThreshold: current.recoveryThreshold || defaultThreshold,
      recoveryDuration: current.recoveryDuration || "5",
      recoveryDurationUnit: current.recoveryDurationUnit || "Minutes",
    }))
  }, [form.recoveryMetric, form.metric, form.recoveryThreshold, form.recoveryDuration, metric.id, metric.unit, setForm])
  return <Panel className="p-6"><div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">10. DISK VERIFICATION & RECOVERY</p><p className="text-xs text-muted-foreground mt-0.5">Define how recovery is detected for this disk rule.</p></div><div className="space-y-5"><div className="grid grid-cols-4 gap-3"><SelectBox value={metric.id} options={DISK_METRICS.map(item => item.id)} onChange={v => updateDisk(setForm, { recoveryMetric: v })} /><SelectBox value={form.recoveryOperator || "Less Than (<)"} options={OPERATORS} onChange={v => updateDisk(setForm, { recoveryOperator: v })} /><input value={form.recoveryThreshold || ""} onChange={e => updateDisk(setForm, { recoveryThreshold: e.target.value })} placeholder="Threshold" className="rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs" /><span className="flex items-center font-mono text-xs text-muted-foreground">{metric.unit}</span></div><div className="flex items-center gap-3"><input value={form.recoveryDuration || ""} onChange={e => updateDisk(setForm, { recoveryDuration: e.target.value })} placeholder="Duration" className="w-28 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs" /><SelectBox value={form.recoveryDurationUnit || "Minutes"} options={["Seconds", "Minutes", "Hours"]} onChange={v => updateDisk(setForm, { recoveryDurationUnit: v })} className="w-32" /></div><p className="rounded-md border border-primary/20 bg-primary/5 p-3 font-mono text-[11px] text-foreground">The recovery condition must remain satisfied for the configured duration before the incident is marked as recovered.</p></div></Panel>
}
