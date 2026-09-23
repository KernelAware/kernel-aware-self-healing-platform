import { useState } from "react"
import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"

const METRIC_INFO = {
  ram: {
    "system_memory_usage_percent":   { label: "Memory Usage %",          desc: "Current physical memory usage as a percentage of total.", unit: "%",    formula: "used / total × 100" },
    "system_memory_used_bytes":      { label: "Memory Used (Bytes)",      desc: "Amount of physical memory currently in use.", unit: "bytes", formula: "psutil.virtual_memory().used" },
    "system_memory_available_bytes": { label: "Memory Available (Bytes)", desc: "Memory available for new processes without swapping.", unit: "bytes", formula: "psutil.virtual_memory().available" },
    "system_memory_free_bytes":      { label: "Memory Free (Bytes)",      desc: "Completely unused physical memory.", unit: "bytes", formula: "psutil.virtual_memory().free" },
    "system_memory_total_bytes":     { label: "Memory Total (Bytes)",     desc: "Total installed physical RAM on the host.", unit: "bytes", formula: "psutil.virtual_memory().total" },
  },
  swap: {
    "system_swap_usage_percent": { label: "Swap Usage %",         desc: "Current swap memory usage as a percentage of total swap.", unit: "%",    formula: "used / total × 100" },
    "system_swap_used_bytes":    { label: "Swap Used (Bytes)",    desc: "Amount of swap memory currently in use.", unit: "bytes", formula: "psutil.swap_memory().used" },
    "system_swap_free_bytes":    { label: "Swap Free (Bytes)",    desc: "Unused swap space available.", unit: "bytes", formula: "psutil.swap_memory().free" },
    "system_swap_total_bytes":   { label: "Swap Total (Bytes)",   desc: "Total swap space configured on the system.", unit: "bytes", formula: "psutil.swap_memory().total" },
  },
}

export default function Step4Memory({ form, setForm }) {
  const [category, setCategory] = useState(form.memoryCategory || "ram")

  const metrics = METRIC_INFO[category]
  const metricKeys = Object.keys(metrics)
  const selectedKey = form.memoryMetric || metricKeys[0]
  const info = metrics[selectedKey] || metrics[metricKeys[0]]

  const handleCategory = (v) => {
    const cat = v === "RAM" ? "ram" : "swap"
    setCategory(cat)
    const firstKey = Object.keys(METRIC_INFO[cat])[0]
    setForm(f => ({ ...f, memoryCategory: cat, memoryMetric: firstKey, condMetric: METRIC_INFO[cat][firstKey].label }))
  }

  const handleMetric = (v) => {
    setForm(f => ({ ...f, memoryMetric: v, condMetric: metrics[v]?.label || v }))
  }

  return (
    <Panel className="p-6">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">4. Target & Metric</p>
        <p className="text-xs text-muted-foreground mt-0.5">Select the memory metric and target for this rule.</p>
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">

          {/* Category */}
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Memory Category <span className="text-destructive">*</span></label>
            <SelectBox
              value={category === "ram" ? "RAM" : "Swap"}
              options={["RAM", "Swap"]}
              onChange={handleCategory}
            />
          </div>

          {/* Metric */}
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Metric <span className="text-destructive">*</span></label>
            <SelectBox
              value={selectedKey}
              options={metricKeys}
              onChange={handleMetric}
            />
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              Prometheus: <span className="text-primary">{selectedKey}</span>
            </p>
          </div>

          {/* Target Type */}
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Target Type <span className="text-destructive">*</span></label>
            <SelectBox
              value={form.targetType || "Host"}
              options={["Host", "Container", "Cluster"]}
              onChange={v => setForm(f => ({ ...f, targetType: v }))}
            />
          </div>

          {/* Host */}
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Host <span className="text-destructive">*</span></label>
            <SelectBox
              value={form.host || ""}
              options={["web-01.prod.local", "web-02.prod.local", "app-01.prod.local", "db-01.prod.local"]}
              onChange={v => setForm(f => ({ ...f, host: v }))}
            />
          </div>

          {/* Aggregation */}
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Aggregation <span className="text-destructive">*</span></label>
            <SelectBox
              value={form.aggregation || "Average (Avg)"}
              options={["Average (Avg)", "Maximum (Max)", "Minimum (Min)"]}
              onChange={v => setForm(f => ({ ...f, aggregation: v }))}
            />
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">How values are aggregated for evaluation.</p>
          </div>
        </div>

        {/* Info Panel */}
        <div className="col-span-1">
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4 h-full space-y-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
              About {info.label}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              {info.desc}
            </p>
            <div className="border-t border-primary/10 pt-3 space-y-2.5">
              <div>
                <p className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider mb-0.5">Prometheus Metric</p>
                <p className="font-mono text-[10px] text-muted-foreground break-all">{selectedKey}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider mb-0.5">Formula</p>
                <p className="font-mono text-[11px] text-muted-foreground">{info.formula}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider mb-0.5">Unit</p>
                <p className="font-mono text-[11px] text-muted-foreground">{info.unit}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider mb-0.5">Category</p>
                <span className={`inline-block rounded px-1.5 py-0.5 font-mono text-[10px] border ${
                  category === "ram"
                    ? "bg-primary/10 border-primary/20 text-primary"
                    : "bg-accent/10 border-accent/20 text-accent"
                }`}>
                  {category === "ram" ? "Physical RAM" : "Swap Memory"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}
