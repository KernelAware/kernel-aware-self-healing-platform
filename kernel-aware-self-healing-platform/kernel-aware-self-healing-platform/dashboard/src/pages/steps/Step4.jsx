import { Panel } from "@/components/kit"
import { SelectBox } from "./wizardComponents"

export default function Step4({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">4. Target & Metric</p><p className="text-xs text-muted-foreground mt-0.5">Select the metric and target for this rule.</p></div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <div><label className="block font-mono text-[11px] text-foreground mb-1.5">Metric <span className="text-destructive">*</span></label><SelectBox value={form.metric} options={["CPU Usage","Memory Usage","Disk I/O","Network Throughput","Load Average"]} onChange={v => setForm(f => ({ ...f, metric: v }))} /></div>
          <div><label className="block font-mono text-[11px] text-foreground mb-1.5">Target Type <span className="text-destructive">*</span></label><SelectBox value={form.targetType} options={["Host","Container","Service","Cluster"]} onChange={v => setForm(f => ({ ...f, targetType: v }))} /></div>
          <div><label className="block font-mono text-[11px] text-foreground mb-1.5">Host <span className="text-destructive">*</span></label><SelectBox value={form.host} options={["web-01.prod.local","web-02.prod.local","app-01.prod.local"]} onChange={v => setForm(f => ({ ...f, host: v }))} /></div>
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Aggregation <span className="text-destructive">*</span></label>
            <SelectBox value={form.aggregation} options={["Average (Avg)","Maximum (Max)","Minimum (Min)","Sum","Count"]} onChange={v => setForm(f => ({ ...f, aggregation: v }))} />
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">How values are aggregated for evaluation.</p>
          </div>
        </div>
        <div className="col-span-1">
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4 h-full">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary mb-2">About CPU Usage</p>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">CPU Usage measures the total CPU utilization percentage on the selected host.</p>
            <p className="mt-3 font-mono text-[10px] text-muted-foreground leading-relaxed">How values are aggregated for evaluation.</p>
          </div>
        </div>
      </div>
    </Panel>
  )
}
