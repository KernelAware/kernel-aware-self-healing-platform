import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"

export default function Step4Network({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">4. Target & Metric</p><p className="text-xs text-muted-foreground mt-0.5">Select the metric and target for this rule.</p></div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <div><label className="block font-mono text-[11px] text-foreground mb-1.5">Metric <span className="text-destructive">*</span></label><SelectBox value={form.metric} options={["Network Error Rate (Incoming)","Network Throughput","Packet Loss"]} onChange={v => setForm(f => ({ ...f, metric: v }))} /></div>
          <div><label className="block font-mono text-[11px] text-foreground mb-1.5">Target Type <span className="text-destructive">*</span></label><SelectBox value={form.targetType} options={["Network Interface","Host","Container"]} onChange={v => setForm(f => ({ ...f, targetType: v }))} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block font-mono text-[11px] text-foreground mb-1.5">Interface <span className="text-destructive">*</span></label><SelectBox value={form.interface} options={["eth0","eth1","ens33","wlan0"]} onChange={v => setForm(f => ({ ...f, interface: v }))} /></div>
            <div><label className="block font-mono text-[11px] text-foreground mb-1.5">Direction <span className="text-destructive">*</span></label><SelectBox value={form.direction} options={["Incoming","Outgoing","Both"]} onChange={v => setForm(f => ({ ...f, direction: v }))} /></div>
          </div>
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Aggregation <span className="text-destructive">*</span></label>
            <SelectBox value={form.aggregation} options={["Average (60s)","Maximum (60s)","Sum (60s)"]} onChange={v => setForm(f => ({ ...f, aggregation: v }))} />
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">How values are aggregated for evaluation.</p>
          </div>
        </div>
        <div className="col-span-1">
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4 h-full">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary mb-2">About Network Error Rate</p>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              Rate of incoming network errors (errors per second) on the selected interface.
            </p>
            <p className="mt-3 font-mono text-[10px] text-muted-foreground leading-relaxed">How values are aggregated for evaluation.</p>
          </div>
        </div>
      </div>
    </Panel>
  )
}
