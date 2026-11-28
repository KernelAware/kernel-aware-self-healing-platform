import { useState } from "react"
import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"

const CATEGORIES = {
  "CPU Temperature": {
    metrics: {
      "hardware_cpu_average_temperature_celsius": {
        label: "CPU Average Temperature",
        desc: "Average temperature across all available CPU cores.",
        unit: "°C",
        labels: [],
      },
      "hardware_cpu_max_temperature_celsius": {
        label: "CPU Maximum Core Temperature",
        desc: "Highest temperature recorded among all CPU cores.",
        unit: "°C",
        labels: [],
      },
    },
    color: "text-orange-400",
    bg: "bg-orange-400/10 border-orange-400/20",
  },

  "Cooling": {
    metrics: {
      "hardware_fan_speed_rpm": {
        label: "Fan Speed",
        desc: "Rotational speed of a system cooling fan in revolutions per minute.",
        unit: "RPM",
        labels: ["fan"],
      },
    },
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
  },

  "Disk Hardware Health": {
    metrics: {
      "hardware_disk_temperature_celsius": {
        label: "Disk Temperature",
        desc: "Operating temperature of a physical disk drive obtained from hardware monitoring data.",
        unit: "°C",
        labels: ["device"],
      },
      "hardware_disk_power_on_hours": {
        label: "Disk Power-On Hours",
        desc: "Total number of hours a physical disk has been powered on. Useful for hardware aging and maintenance monitoring.",
        unit: "Hours",
        labels: ["device"],
      },
    },
    color: "text-yellow-400",
    bg: "bg-yellow-400/10 border-yellow-400/20",
  },
}

const LABEL_OPTIONS = {
  fan:    ["Fan 1", "Fan 2", "Fan 3", "All"],
  device: ["/dev/sda", "/dev/sdb", "/dev/nvme0", "All"],
}

export default function Step4Hardware({ form, setForm }) {
  const [category, setCategory] = useState(form.hardwareCategory || "CPU Temperature")
  const catData = CATEGORIES[category]
  const metricKeys = Object.keys(catData.metrics)
  const selectedKey = catData.metrics[form.hardwareMetric] ? form.hardwareMetric : metricKeys[0]
  const info = catData.metrics[selectedKey] || catData.metrics[metricKeys[0]]
  const hasLabels = info.labels.length > 0

  const handleCategory = (v) => {
    setCategory(v)
    const firstKey = Object.keys(CATEGORIES[v].metrics)[0]
    setForm(f => ({ ...f, hardwareCategory: v, hardwareMetric: firstKey, condMetric: firstKey }))
  }

  const handleMetric = (v) => {
    setForm(f => ({ ...f, hardwareMetric: v, condMetric: v }))
  }

  console.log(
  "STEP 4 - HARDWARE METRIC FORM DATA:\n",
  JSON.stringify(form, null, 2)
)

  return (
    <Panel className="p-6">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">4. Target & Metric</p>
        <p className="text-xs text-muted-foreground mt-0.5">Select the hardware metric and target for this rule.</p>
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">

          {/* Category */}
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Hardware Category <span className="text-destructive">*</span></label>
            <SelectBox value={category} options={Object.keys(CATEGORIES)} onChange={handleCategory} />
          </div>

          {/* Metric */}
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Metric <span className="text-destructive">*</span></label>
            <SelectBox value={selectedKey} options={metricKeys} onChange={handleMetric} />
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              Prometheus: <span className="text-primary">{selectedKey}</span>
            </p>
          </div>

          {/* Label selectors if metric has labels */}
          {hasLabels && info.labels.map(lbl => (
            <div key={lbl}>
              <label className="block font-mono text-[11px] text-foreground mb-1.5 capitalize">{lbl} Selector <span className="text-destructive">*</span></label>
              <SelectBox
                value={form[`hardware_label_${lbl}`] || LABEL_OPTIONS[lbl]?.[0] || ""}
                options={LABEL_OPTIONS[lbl] || []}
                onChange={v => setForm(f => ({ ...f, [`hardware_label_${lbl}`]: v }))}
              />
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">Label: <span className="text-primary">{lbl}</span></p>
            </div>
          ))}

          {/* Target Type */}
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Target Type <span className="text-destructive">*</span></label>
            <SelectBox value={form.targetType || "Host"} options={["Host", "Cluster Node"]} onChange={v => setForm(f => ({ ...f, targetType: v }))} />
          </div>

          {/* Host */}
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Host <span className="text-destructive">*</span></label>
            <SelectBox value={form.host || ""} options={["web-01.prod.local", "web-02.prod.local", "app-01.prod.local", "db-01.prod.local"]} onChange={v => setForm(f => ({ ...f, host: v }))} />
          </div>

          {/* Aggregation */}
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Aggregation <span className="text-destructive">*</span></label>
            <SelectBox value={form.aggregation || "Average (Avg)"} options={["Average (Avg)", "Maximum (Max)", "Minimum (Min)", "Last Value"]} onChange={v => setForm(f => ({ ...f, aggregation: v }))} />
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">How values are aggregated for evaluation.</p>
          </div>
        </div>

        {/* Info Panel */}
        <div className="col-span-1">
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4 h-full space-y-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">About {info.label}</p>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">{info.desc}</p>
            <div className="border-t border-primary/10 pt-3 space-y-2.5">
              <div>
                <p className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider mb-1">Prometheus Metric</p>
                <p className="font-mono text-[10px] text-muted-foreground break-all">{selectedKey}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider mb-1">Unit</p>
                <p className="font-mono text-[11px] text-muted-foreground">{info.unit}</p>
              </div>
              {hasLabels && (
                <div>
                  <p className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider mb-1">Labels</p>
                  <div className="flex flex-wrap gap-1">
                    {info.labels.map(l => (
                      <span key={l} className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 font-mono text-[10px] text-primary">{l}</span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider mb-1">Category</p>
                <span className={`inline-block rounded px-1.5 py-0.5 font-mono text-[10px] border ${catData.bg} ${catData.color}`}>
                  {category}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}
