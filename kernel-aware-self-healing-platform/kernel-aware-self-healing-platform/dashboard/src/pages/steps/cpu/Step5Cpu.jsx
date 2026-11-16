import { useEffect, useState } from "react"
import { Panel } from "@/components/kit"
import { queryPrometheus } from "@/services/api"
import { SelectBox } from "../wizardComponents"
import { CPU_METRICS } from "./Step4Cpu"

const OPERATORS = [
  "Greater Than (>)",
  "Greater Than or Equal (>=)",
  "Less Than (<)",
  "Less Than or Equal (<=)",
  "Equals (=)",
]

const DURATION_UNITS = ["Seconds", "Minutes", "Hours"]

const OPERATOR_SYMBOLS = {
  "Greater Than (>)": ">",
  "Greater Than or Equal (>=)": ">=",
  "Less Than (<)": "<",
  "Less Than or Equal (<=)": "<=",
  "Equals (=)": "=",
}

function formatValue(value, metric) {
  if (value == null || Number.isNaN(value)) return "Not available"
  if (metric.value === "cpu_ctx_switches") return Math.round(value).toString()
  if (metric.unit === "MHz") return Math.round(value).toString()
  if (metric.unit === "load") return Number(value).toFixed(2)
  return Number(value).toFixed(1)
}

export default function Step5Cpu({ form, setForm }) {
  const selectedMetric = CPU_METRICS.find(metric => metric.value === form.metric) || CPU_METRICS[0]
  const [currentValue, setCurrentValue] = useState(null)
  const [coreOptions, setCoreOptions] = useState([])
  const selectedCore = form.cpuCore || coreOptions[0]?.value || ""
  const threshold = form.condThreshold
  const numericThreshold = threshold === "" ? null : Number(threshold)
  const thresholdInvalid = numericThreshold != null && (
    Number.isNaN(numericThreshold) ||
    numericThreshold < selectedMetric.min ||
    (selectedMetric.max != null && numericThreshold > selectedMetric.max)
  )

  useEffect(() => {
    let cancelled = false

    async function loadMetric() {
      setCurrentValue(null)
      setCoreOptions([])

      try {
        const results = await queryPrometheus(selectedMetric.value)
        if (cancelled) return

        if (selectedMetric.value === "cpu_core_usage_percent") {
          const cores = results
            .map(result => ({
              label: result.metric.core,
              value: result.metric.core,
              currentValue: Number(result.value?.[1]),
            }))
            .filter(core => core.label && !Number.isNaN(core.currentValue))
          setCoreOptions(cores)
          const activeCore = cores.find(core => core.value === selectedCore) || cores[0]
          setCurrentValue(activeCore?.currentValue ?? null)
          if (activeCore && activeCore.value !== form.cpuCore) {
            setForm(current => ({ ...current, cpuCore: activeCore.value }))
          }
          return
        }

        setCurrentValue(results[0]?.value?.[1] != null ? Number(results[0].value[1]) : null)
      } catch {
        if (!cancelled) setCurrentValue(null)
      }
    }

    loadMetric()
    return () => { cancelled = true }
  }, [selectedMetric.value])

  useEffect(() => {
    if (selectedMetric.value !== "cpu_core_usage_percent") return
    const core = coreOptions.find(option => option.value === selectedCore)
    setCurrentValue(core?.currentValue ?? null)
  }, [coreOptions, selectedCore, selectedMetric.value])

  const updateForm = (changes) => setForm(formValue => ({ ...formValue, ...changes }))
  const thresholdHelp = selectedMetric.max != null
    ? `Enter a value from ${selectedMetric.min} to ${selectedMetric.max}.`
    : `Enter a value of ${selectedMetric.min} or greater.`
  const previewMetric = selectedMetric.label.replace("Overall ", "")
  const previewCore = selectedMetric.value === "cpu_core_usage_percent" && selectedCore
    ? ` for ${selectedCore}`
    : ""
  const durationUnit = form.condDurationUnit || "Minutes"
  const duration = form.condDuration || "—"
  const thresholdText = threshold || "—"

  return (
    <Panel className="p-6">
      <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">5. Conditions (When)</p><p className="text-xs text-muted-foreground mt-0.5">Define when this rule should trigger.</p></div>
      <div className="space-y-5">
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_20rem_auto]">
          <div className="min-w-0">
            <label className="block font-mono text-[11px] text-foreground mb-2">Metric</label>
            <div className="truncate rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground">
              {selectedMetric.label}
            </div>
          </div>
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-2">Operator</label>
            <SelectBox value={form.condOperator} options={OPERATORS} onChange={value => updateForm({ condOperator: value })} />
          </div>
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-2">Threshold</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={selectedMetric.min}
                max={selectedMetric.max}
                step="any"
                value={threshold}
                onChange={event => updateForm({ condThreshold: event.target.value })}
                aria-invalid={thresholdInvalid}
                className="w-28 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none aria-[invalid=true]:border-destructive"
              />
              {selectedMetric.unit && <span className="font-mono text-xs text-muted-foreground">{selectedMetric.unit}</span>}
            </div>
          </div>
        </div>

        {selectedMetric.value === "cpu_core_usage_percent" && (
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">CPU Core</label>
            <SelectBox value={selectedCore} options={coreOptions} onChange={value => updateForm({ cpuCore: value })} className="w-44" />
          </div>
        )}

        {thresholdInvalid && <p className="-mt-4 font-mono text-[10px] text-destructive">{thresholdHelp}</p>}

        <div>
          <label className="block font-mono text-[11px] text-foreground mb-1.5">Duration</label>
          <div className="flex items-center gap-2">
            <input type="number" min="0" value={form.condDuration || ""} onChange={event => updateForm({ condDuration: event.target.value })}
              className="w-20 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none" />
            <SelectBox value={durationUnit} options={DURATION_UNITS} onChange={value => updateForm({ condDurationUnit: value })} className="w-32" />
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary mb-2 font-bold">Selected Metric</p>
          <p className="font-mono text-xs text-foreground">{selectedMetric.label}</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">Current value: {formatValue(currentValue, selectedMetric)}{currentValue != null && selectedMetric.unit ? selectedMetric.unit : ""}</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">Metric: {selectedMetric.value}</p>
        </div>

        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary mb-1 font-bold">Condition Preview</p>
          <p className="font-mono text-xs text-foreground">
            {previewMetric}{previewCore} {OPERATOR_SYMBOLS[form.condOperator] || ">"} {thresholdText}{selectedMetric.unit} for {duration} {durationUnit.toLowerCase()}
          </p>
        </div>
      </div>
    </Panel>
  )
}
