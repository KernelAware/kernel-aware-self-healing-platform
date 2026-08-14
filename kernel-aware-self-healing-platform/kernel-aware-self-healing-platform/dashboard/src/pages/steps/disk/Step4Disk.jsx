import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"

export default function Step4Disk({ form, setForm }) {
  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">4. Target & Metric</p><p className="text-xs text-muted-foreground mt-0.5">Select the disk metric and target.</p></div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[11px] text-foreground mb-1.5">Metric Category <span className="text-destructive">*</span></label>
              <SelectBox value={form.diskMetricCategory || "Disk"} options={["Disk","Disk I/O","Filesystem"]} onChange={v => setForm(f => ({ ...f, diskMetricCategory: v }))} />
            </div>
            <div>
              <label className="block font-mono text-[11px] text-foreground mb-1.5">Disk Usage <span className="text-destructive">*</span></label>
              <SelectBox value={form.metric} options={["Disk Usage Percentage","Disk Free Space","Disk Read Bytes","Disk Write Bytes"]} onChange={v => setForm(f => ({ ...f, metric: v }))} />
            </div>
          </div>
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Target Type <span className="text-destructive">*</span></label>
            <SelectBox value={form.targetType} options={["Partition (Mount Point)","Host","Container"]} onChange={v => setForm(f => ({ ...f, targetType: v }))} />
          </div>
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Host <span className="text-destructive">*</span></label>
            <SelectBox value={form.host} options={["web-01.prod.local","web-02.prod.local","app-01.prod.local"]} onChange={v => setForm(f => ({ ...f, host: v }))} />
          </div>
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Mount Point <span className="text-destructive">*</span></label>
            <SelectBox value={form.mountPoint || "/ (Root)"} options={["/ (Root)","/home","/var","/tmp","/boot"]} onChange={v => setForm(f => ({ ...f, mountPoint: v }))} />
          </div>
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Aggregation <span className="text-destructive">*</span></label>
            <SelectBox value={form.aggregation} options={["Average (60s)","Maximum (60s)","Minimum (60s)"]} onChange={v => setForm(f => ({ ...f, aggregation: v }))} />
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">How values are aggregated for evaluation.</p>
          </div>
        </div>
        <div className="col-span-1">
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4 h-full space-y-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">About Disk Usage (%)</p>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              Disk Usage Percentage shows how much of the mounted partition storage is being used.
            </p>
            <div className="border-t border-primary/10 pt-3 space-y-2">
              <div>
                <p className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider mb-0.5">Formula</p>
                <p className="font-mono text-[11px] text-muted-foreground">Used / Total × 100</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider mb-0.5">Unit</p>
                <p className="font-mono text-[11px] text-muted-foreground">Percentage (%)</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider mb-0.5">Labels</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {["service","mountpoint","filesystem"].map(l => (
                    <span key={l} className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 font-mono text-[10px] text-primary">{l}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}
