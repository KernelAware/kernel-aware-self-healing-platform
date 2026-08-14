import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"

const ALL_METRICS = {
  "hardware_cpu_package_temperature_celsius":  { label: "CPU Package Temp",       unit: "°C" },
  "hardware_cpu_average_temperature_celsius":  { label: "CPU Average Core Temp",  unit: "°C" },
  "hardware_cpu_max_temperature_celsius":      { label: "CPU Max Core Temp",       unit: "°C" },
  "hardware_cpu_core_temperature_celsius":     { label: "CPU Core Temperature",    unit: "°C" },
  "hardware_fan_speed_rpm":                    { label: "Fan Speed",               unit: "RPM" },
  "hardware_battery_percentage":               { label: "Battery Percentage",      unit: "%" },
  "hardware_battery_charging":                 { label: "Battery Charging Status", unit: "0/1" },
  "hardware_disk_health":                      { label: "Disk SMART Health",       unit: "0/1" },
  "hardware_disk_temperature_celsius":         { label: "Disk Temperature",        unit: "°C" },
  "hardware_disk_power_on_hours":              { label: "Disk Power-On Hours",     unit: "hrs" },
  "hardware_system_uptime_seconds":            { label: "System Uptime",           unit: "sec" },
}

const CATEGORY_METRICS = {
  "CPU Temperature":   ["hardware_cpu_package_temperature_celsius","hardware_cpu_average_temperature_celsius","hardware_cpu_max_temperature_celsius","hardware_cpu_core_temperature_celsius"],
  "Fan":               ["hardware_fan_speed_rpm"],
  "Battery":           ["hardware_battery_percentage","hardware_battery_charging"],
  "SMART / Disk Health": ["hardware_disk_health","hardware_disk_temperature_celsius","hardware_disk_power_on_hours"],
  "System":            ["hardware_system_uptime_seconds"],
}

export default function Step5Hardware({ form, setForm }) {
  const category = form.hardwareCategory || "CPU Temperature"
  const availableMetrics = CATEGORY_METRICS[category] || CATEGORY_METRICS["CPU Temperature"]
  const defaultMetric = form.hardwareMetric || availableMetrics[0]

  const [conditions, setConditions] = useState([
    { id: 1, metric: defaultMetric, operator: "Greater Than (>)", threshold: "" }
  ])

  const addCondition = () => {
    setConditions(c => [...c, { id: Date.now(), metric: availableMetrics[0], operator: "Greater Than (>)", threshold: "" }])
  }

  const removeCondition = (id) => {
    if (conditions.length === 1) return
    setConditions(c => c.filter(x => x.id !== id))
  }

  const updateCondition = (id, field, value) => {
    setConditions(c => c.map(x => x.id === id ? { ...x, [field]: value } : x))
    if (conditions[0]?.id === id) {
      if (field === "threshold") setForm(f => ({ ...f, condThreshold: value }))
      if (field === "operator")  setForm(f => ({ ...f, condOperator: value }))
      if (field === "metric")    setForm(f => ({ ...f, hardwareMetric: value, condMetric: value }))
    }
  }

  const firstMeta = ALL_METRICS[conditions[0]?.metric] || {}

  return (
    <Panel className="p-6">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">5. Conditions (When)</p>
        <p className="text-xs text-muted-foreground mt-0.5">Define when this rule should trigger.</p>
      </div>
      <div className="space-y-5">

        {/* Category badge */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">Category:</span>
          <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">{category}</span>
        </div>

        {/* Condition rows */}
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center pb-1 border-b border-border">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Metric</span>
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider w-44 text-center">Operator</span>
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider w-32 text-center">Threshold</span>
            <span className="w-8" />
          </div>

          {conditions.map((cond) => {
            const meta = ALL_METRICS[cond.metric] || {}
            return (
              <div key={cond.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                <SelectBox
                  value={cond.metric}
                  options={availableMetrics}
                  onChange={v => updateCondition(cond.id, "metric", v)}
                />
                <SelectBox
                  value={cond.operator}
                  options={["Greater Than (>)", "Less Than (<)", "Equals (=)"]}
                  onChange={v => updateCondition(cond.id, "operator", v)}
                  className="w-44"
                />
                <div className="flex items-center gap-1.5 w-32">
                  <input
                    type="number"
                    value={cond.threshold}
                    onChange={e => updateCondition(cond.id, "threshold", e.target.value)}
                    className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
                  />
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">{meta.unit || ""}</span>
                </div>
                <button
                  onClick={() => removeCondition(cond.id)}
                  disabled={conditions.length === 1}
                  className="flex size-8 items-center justify-center rounded-md border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )
          })}

          <button
            onClick={addCondition}
            className="flex items-center gap-1.5 rounded border border-border bg-card px-3 py-1.5 font-mono text-[11px] text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <Plus className="size-3" /> Add Condition
          </button>
        </div>

        {/* Duration */}
        <div>
          <label className="block font-mono text-[11px] text-foreground mb-1.5">Duration (How long it must persist)</label>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="number"
              value={form.condDuration}
              onChange={e => setForm(f => ({ ...f, condDuration: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
            />
            <SelectBox value="Minutes" options={["Seconds", "Minutes", "Hours"]} onChange={() => {}} className="w-28" />
            <span className="font-mono text-[11px] text-foreground">Evaluation Frequency <span className="text-primary">*</span></span>
            <SelectBox
              value={form.condInterval || "Every 30 seconds"}
              options={["Every 15 seconds", "Every 30 seconds", "Every 1 minute", "Every 5 minutes"]}
              onChange={v => setForm(f => ({ ...f, condInterval: v }))}
              className="w-44"
            />
          </div>
        </div>

        {/* Occurrences */}
        <div>
          <label className="block font-mono text-[11px] text-foreground mb-1.5">Required Occurrences (within the window)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={form.condOccurrences}
              onChange={e => setForm(f => ({ ...f, condOccurrences: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
            />
            <span className="font-mono text-xs text-muted-foreground">out of</span>
            <input
              type="number"
              value={form.condOutOf}
              onChange={e => setForm(f => ({ ...f, condOutOf: e.target.value }))}
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary font-bold">Condition Preview</p>
          <p className="font-mono text-xs text-foreground">
            {ALL_METRICS[conditions[0]?.metric]?.label || "—"} &gt; {conditions[0]?.threshold || "—"} {firstMeta.unit || ""} for {form.condDuration || "—"} minutes
          </p>
          <p className="font-mono text-[10px] text-muted-foreground">
            Prometheus: <span className="text-primary">{conditions[0]?.metric}</span>
          </p>
        </div>
      </div>
    </Panel>
  )
}
