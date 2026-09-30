import { useEffect, useState } from "react"
import { Info, Plus, X } from "lucide-react"
import { Panel } from "@/components/kit"
import { queryPrometheus } from "@/services/api"
import { SelectBox } from "../wizardComponents"
import { CPU_METRICS } from "./Step4Cpu"

const OPERATORS = [
  { label: "Less Than (<)", value: "<" },
  { label: "Less Than or Equal (<=)", value: "<=" },
  { label: "Greater Than (>)", value: ">" },
  { label: "Greater Than or Equal (>=)", value: ">=" },
]

const RECOVERY_DEFAULTS = {
  cpu_usage_percent: { threshold: "70", operator: "<" },
  cpu_load_1min: { threshold: "2.0", operator: "<" },
  cpu_core_usage_percent: { threshold: "70", operator: "<" },
  cpu_freq_current_mhz: { threshold: "1800", operator: ">" },
  cpu_times_iowait: { threshold: "10", operator: "<" },
}

const DURATION_UNITS = ["Seconds", "Minutes", "Hours"]
const FALLBACK_CORES = [{ label: "core_0", value: "core_0" }]

function getMetric(metricValue) {
  return CPU_METRICS.find(metric => metric.value === metricValue)
}

function getUnit(metricValue) {
  const metric = getMetric(metricValue)
  return metric?.unit || "count"
}

function getMetricLabel(metricValue) {
  if (metricValue === "cpu_usage_percent") return "CPU Usage (%)"
  return getMetric(metricValue)?.label || metricValue
}

function getRecommendedCondition(metricValue) {
  const recommendation = RECOVERY_DEFAULTS[metricValue]
  return {
    operator: recommendation?.operator || "<",
    threshold: recommendation?.threshold || "",
  }
}

export default function Step10Cpu({ form, setForm }) {
  const conditions = Array.isArray(form.recovery?.metric)
    ? form.recovery.metric
    : []
  const hasCoreMetric = conditions.some(
    condition => condition.metric === "cpu_core_usage_percent"
  )
  const [coreOptions, setCoreOptions] = useState([])
  const availableMetrics = CPU_METRICS.filter(
    metric => !conditions.some(condition => condition.metric === metric.value)
  )

  useEffect(() => {
    if (!hasCoreMetric) {
      setCoreOptions([])
      return undefined
    }

    let cancelled = false

    queryPrometheus("cpu_core_usage_percent")
      .then(results => {
        if (cancelled) return
        const cores = results
          .map(result => ({
            label: result.metric.core,
            value: result.metric.core,
          }))
          .filter(core => core.label)
        setCoreOptions(cores.length > 0 ? cores : FALLBACK_CORES)
      })
      .catch(() => {
        if (!cancelled) setCoreOptions(FALLBACK_CORES)
      })

    return () => {
      cancelled = true
    }
  }, [hasCoreMetric])

  const addCondition = () => {
    if (availableMetrics.length === 0) return

    const metric = availableMetrics.find(item => item.value === form.metric)
      || availableMetrics[0]
    const recommended = getRecommendedCondition(metric.value)

    setForm(currentForm => ({
      ...currentForm,
      recovery: {
        ...currentForm.recovery,
        required: true,
        metric: [
          ...(Array.isArray(currentForm.recovery?.metric)
            ? currentForm.recovery.metric
            : []),
          {
            metric: metric.value,
            operator: recommended.operator,
            threshold: recommended.threshold,
            duration: "5",
            durationUnit: "Minutes",
            ...(metric.value === "cpu_core_usage_percent"
              ? { cpuCore: coreOptions[0]?.value || "core_0" }
              : {}),
          },
        ],
      },
    }))
  }

  const updateCondition = (index, field, value) => {
    setForm(currentForm => ({
      ...currentForm,
      recovery: {
        ...currentForm.recovery,
        metric: (Array.isArray(currentForm.recovery?.metric)
          ? currentForm.recovery.metric
          : []
        ).map((condition, conditionIndex) => {
          if (conditionIndex !== index) return condition

          if (field === "metric") {
            const recommended = getRecommendedCondition(value)
            return {
              ...condition,
              metric: value,
              ...recommended,
              ...(value === "cpu_core_usage_percent"
                ? { cpuCore: condition.cpuCore || coreOptions[0]?.value || "core_0" }
                : { cpuCore: undefined }),
            }
          }

          return { ...condition, [field]: value }
        }),
      },
    }))
  }

  const removeCondition = index => {
    setForm(currentForm => ({
      ...currentForm,
      recovery: {
        ...currentForm.recovery,
        metric: (Array.isArray(currentForm.recovery?.metric)
          ? currentForm.recovery.metric
          : []
        ).filter((_, conditionIndex) => conditionIndex !== index),
      },
    }))
  }

  const getPreview = () => {
    if (conditions.length === 0) {
      return "No custom recovery verification configured. The system will use the opposite of the Step 5 conditions."
    }

    return conditions.map(condition => {
      const core = condition.metric === "cpu_core_usage_percent"
        ? ` (${condition.cpuCore || coreOptions[0]?.value || "core_0"})`
        : ""
      const durationUnit = (condition.durationUnit || "Minutes").toLowerCase()
      const threshold = condition.threshold === "" || condition.threshold == null
        ? "?"
        : condition.threshold
      return `${getMetricLabel(condition.metric)}${core} ${condition.operator || "<"} ${threshold} ${getUnit(condition.metric)} for ${condition.duration || "?"} ${durationUnit}`
    }).join(" AND ")
  }

  return (
    <Panel className="p-6">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
          10. Verification &amp; Recovery
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Define how the system verifies that an incident has recovered.
        </p>
      </div>

      <div className="space-y-5">
        <div className="flex gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
          <Info className="size-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-mono text-[11px] text-foreground leading-relaxed">
              If no recovery verification is configured, the system automatically uses the opposite of the conditions defined in Step 5.
            </p>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              Add recovery conditions only when you want to explicitly define different values for recovery verification.
            </p>
          </div>
        </div>

        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary mb-1 font-bold">
            Recovery Preview
          </p>
          <p className="font-mono text-xs text-foreground leading-relaxed">
            {getPreview()}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-mono text-xs font-semibold text-foreground">
                Recovery Verification
              </p>
              <p className="font-mono text-[10px] text-muted-foreground mt-1">
                All configured recovery conditions must be satisfied before the incident is marked as recovered.
              </p>
            </div>
            <button
              type="button"
              onClick={addCondition}
              disabled={availableMetrics.length === 0}
              className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 font-mono text-[10px] text-primary hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="size-3.5" />
              Add Condition
            </button>
          </div>

          <div className="space-y-3">
            {conditions.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-5 text-center">
                <p className="font-mono text-[11px] text-muted-foreground">
                  No custom recovery conditions configured.
                </p>
                <p className="font-mono text-[10px] text-muted-foreground mt-1">
                  Step 5 conditions will automatically be inverted for recovery verification.
                </p>
                <button
                  type="button"
                  onClick={addCondition}
                  disabled={availableMetrics.length === 0}
                  className="mt-3 font-mono text-[10px] text-primary hover:underline disabled:opacity-40"
                >
                  + Add recovery condition
                </button>
              </div>
            )}

            {conditions.map((condition, index) => (
              <div
                key={`${condition.metric}-${index}`}
                className="rounded-md border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-primary font-bold">
                    Recovery Condition {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeCondition(index)}
                    className="flex items-center gap-1 font-mono text-[10px] text-destructive hover:underline"
                  >
                    <X className="size-3" />
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block font-mono text-[10px] text-muted-foreground mb-1.5">
                      Metric
                    </label>
                    <SelectBox
                      value={condition.metric}
                      options={CPU_METRICS}
                      onChange={value => updateCondition(index, "metric", value)}
                      className="w-full"
                    />
                    {condition.metric === "cpu_core_usage_percent" && (
                      <div className="mt-3">
                        <label className="block font-mono text-[10px] text-muted-foreground mb-1.5">
                          CPU Core
                        </label>
                        <SelectBox
                          value={condition.cpuCore || coreOptions[0]?.value || "core_0"}
                          options={coreOptions.length > 0 ? coreOptions : FALLBACK_CORES}
                          onChange={value => updateCondition(index, "cpuCore", value)}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] text-muted-foreground mb-1.5">
                      Recovery Threshold
                    </label>
                    <div className="flex items-center gap-2">
                      <SelectBox
                        value={condition.operator}
                        options={OPERATORS}
                        onChange={value => updateCondition(index, "operator", value)}
                        className="w-40"
                      />
                      <input
                        type="number"
                        min="0"
                        step={condition.metric === "cpu_ctx_switches" ? "1" : "any"}
                        value={condition.threshold}
                        onChange={event => updateCondition(index, "threshold", event.target.value)}
                        placeholder="70"
                        className="w-20 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
                      />
                      <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {getUnit(condition.metric)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] text-muted-foreground mb-1.5">
                      Recovery Duration
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={condition.duration}
                        onChange={event => updateCondition(index, "duration", event.target.value)}
                        className="w-20 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
                      />
                      <SelectBox
                        value={condition.durationUnit}
                        options={DURATION_UNITS}
                        onChange={value => updateCondition(index, "durationUnit", value)}
                        className="w-28"
                      />
                    </div>
                  </div>
                </div>

                <p className="mt-3 font-mono text-[10px] text-muted-foreground">
                  This condition must remain satisfied for the configured duration before the incident is marked as recovered.
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-secondary/10 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Stored Recovery Configuration
          </p>
          <p className="font-mono text-[11px] text-foreground">
            {conditions.length === 0
              ? "recovery.metric = []"
              : `recovery.metric = ${conditions.length} condition${conditions.length > 1 ? "s" : ""}`}
          </p>
        </div>
      </div>
    </Panel>
  )
}