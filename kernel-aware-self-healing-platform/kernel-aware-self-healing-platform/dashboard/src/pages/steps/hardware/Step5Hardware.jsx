
import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"

// --------------------------------------------------
// AVAILABLE HARDWARE METRICS
// --------------------------------------------------

const ALL_METRICS = {
  hardware_cpu_average_temperature_celsius: {
    label: "CPU Average Temperature",
    unit: "°C",
  },

  hardware_cpu_max_temperature_celsius: {
    label: "CPU Maximum Core Temperature",
    unit: "°C",
  },

  hardware_fan_speed_rpm: {
    label: "Fan Speed",
    unit: "RPM",
  },

  hardware_disk_temperature_celsius: {
    label: "Disk Temperature",
    unit: "°C",
  },

  hardware_disk_power_on_hours: {
    label: "Disk Power-On Hours",
    unit: "Hours",
  },
}

// --------------------------------------------------
// CATEGORY-BASED METRIC SELECTION
// --------------------------------------------------

const CATEGORY_METRICS = {
  "CPU Temperature": [
    "hardware_cpu_average_temperature_celsius",
    "hardware_cpu_max_temperature_celsius",
  ],

  "Cooling": [
    "hardware_fan_speed_rpm",
  ],

  "Disk Hardware Health": [
    "hardware_disk_temperature_celsius",
    "hardware_disk_power_on_hours",
  ],
}

// --------------------------------------------------
// METRIC-SPECIFIC OPERATORS
// --------------------------------------------------

const METRIC_OPERATORS = {
  hardware_cpu_average_temperature_celsius: [
    "Greater Than (>)",
    "Less Than (<)",
  ],

  hardware_cpu_max_temperature_celsius: [
    "Greater Than (>)",
    "Less Than (<)",
  ],

  hardware_fan_speed_rpm: [
    "Greater Than (>)",
    "Less Than (<)",
    "Equals (=)",
  ],

  hardware_disk_temperature_celsius: [
    "Greater Than (>)",
    "Less Than (<)",
  ],

  hardware_disk_power_on_hours: [
    "Greater Than (>)",
    "Less Than (<)",
  ],
}

// --------------------------------------------------
// DEFAULT OPERATORS
// --------------------------------------------------

const DEFAULT_OPERATORS = {
  hardware_cpu_average_temperature_celsius: "Greater Than (>)",
  hardware_cpu_max_temperature_celsius: "Greater Than (>)",
  hardware_fan_speed_rpm: "Less Than (<)",
  hardware_disk_temperature_celsius: "Greater Than (>)",
  hardware_disk_power_on_hours: "Greater Than (>)",
}

const DEFAULT_CONDITION = {
  id: 1,
  metric: "hardware_cpu_average_temperature_celsius",
  operator: "Greater Than (>)",
  threshold: "",
}

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------

export default function Step5Hardware({ form, setForm }) {

  const category = form.hardwareCategory || "CPU Temperature"

  const availableMetrics =
    CATEGORY_METRICS[category] || CATEGORY_METRICS["CPU Temperature"]

  const defaultMetric = availableMetrics.includes(form.hardwareMetric)
    ? form.hardwareMetric
    : availableMetrics[0]

  // Initialize conditions from shared wizard form
  const [conditions, setConditions] = useState(() => {

    if (Array.isArray(form.hardwareConditions) &&
        form.hardwareConditions.length > 0) {
      return form.hardwareConditions
    }

    return [{
      ...DEFAULT_CONDITION,
      metric: defaultMetric,
      operator: DEFAULT_OPERATORS[defaultMetric],
      threshold: form.condThreshold || "",
    }]
  })

  // Keep conditions synchronized with shared wizard form
  useEffect(() => {
    setForm(f => ({
      ...f,
      hardwareConditions: conditions,
    }))
  }, [conditions, setForm])

    console.log(
    "STEP 5 - HARDWARE CONDITION FORM DATA:\n",
    JSON.stringify(form, null, 2)
  )

  console.log(
  "STEP 5 - LOCAL CONDITIONS:\n",
  JSON.stringify(conditions, null, 2)
)

  // --------------------------------------------------
  // CONDITION HANDLERS
  // --------------------------------------------------

  const addCondition = () => {

    const metric = availableMetrics[0]

    setConditions(c => [
      ...c,
      {
        id: Date.now(),
        metric,
        operator: DEFAULT_OPERATORS[metric],
        threshold: "",
      },
    ])
  }

  const removeCondition = (id) => {

    if (conditions.length === 1) return

    setConditions(c => c.filter(x => x.id !== id))
  }

  const updateCondition = (id, field, value) => {

    setConditions(c =>
      c.map(x => {

        if (x.id !== id) return x

        if (field === "metric") {
          return {
            ...x,
            metric: value,
            operator: DEFAULT_OPERATORS[value],
            threshold: "",
          }
        }

        return {
          ...x,
          [field]: value,
        }
      })
    )

    // Synchronize first condition with existing backend form fields
    if (conditions[0]?.id === id) {

      if (field === "threshold") {
        setForm(f => ({
          ...f,
          condThreshold: value,
        }))
      }

      if (field === "operator") {
        setForm(f => ({
          ...f,
          condOperator: value,
        }))
      }

      if (field === "metric") {
        setForm(f => ({
          ...f,
          hardwareMetric: value,
          condMetric: value,
          condOperator: DEFAULT_OPERATORS[value],
          condThreshold: "",
        }))
      }
    }
  }

  // --------------------------------------------------
  // CONDITION PREVIEW
  // --------------------------------------------------

  const firstCondition = conditions[0]

  const firstMeta = ALL_METRICS[firstCondition?.metric] || {}

  const durationUnit = form.condDurationUnit || "Minutes"

  const operatorSymbol = {
    "Greater Than (>)": ">",
    "Less Than (<)": "<",
    "Equals (=)": "=",
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <Panel className="p-6">

      {/* Header */}

      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
          5. Conditions (When)
        </p>

        <p className="text-xs text-muted-foreground mt-0.5">
          Define when this rule should trigger.
        </p>
      </div>

      <div className="space-y-5">

        {/* Category */}

        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            Category:
          </span>

          <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
            {category}
          </span>
        </div>

        {/* Condition rows */}

        <div className="space-y-3">

          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center pb-1 border-b border-border">

            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              Metric
            </span>

            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider w-44 text-center">
              Operator
            </span>

            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider w-32 text-center">
              Threshold
            </span>

            <span className="w-8" />

          </div>

          {conditions.map(cond => {

            const meta = ALL_METRICS[cond.metric] || {}

            const operators =
              METRIC_OPERATORS[cond.metric] || ["Greater Than (>)"]

            return (

              <div
                key={cond.id}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center"
              >

                {/* Metric */}

                <SelectBox
                  value={cond.metric}
                  options={availableMetrics}
                  onChange={v =>
                    updateCondition(cond.id, "metric", v)
                  }
                />

                {/* Operator */}

                <SelectBox
                  value={cond.operator}
                  options={operators}
                  onChange={v =>
                    updateCondition(cond.id, "operator", v)
                  }
                  className="w-44"
                />

                {/* Threshold */}

                <div className="flex items-center gap-1.5 w-32">

                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={cond.threshold}
                    onChange={e =>
                      updateCondition(
                        cond.id,
                        "threshold",
                        e.target.value
                      )
                    }
                    placeholder="Value"
                    className="w-20 rounded-md border border-border bg-card px-2 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
                  />

                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                    {meta.unit || ""}
                  </span>

                </div>

                {/* Remove */}

                <button
                  type="button"
                  onClick={() => removeCondition(cond.id)}
                  disabled={conditions.length === 1}
                  className="flex size-8 items-center justify-center rounded-md border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="size-3.5" />
                </button>

              </div>
            )
          })}

          {/* Add condition */}

          <button
            type="button"
            onClick={addCondition}
            className="flex items-center gap-1.5 rounded border border-border bg-card px-3 py-1.5 font-mono text-[11px] text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <Plus className="size-3" />
            Add Condition
          </button>

        </div>

        {/* Duration */}

        <div>

          <label className="block font-mono text-[11px] text-foreground mb-1.5">
            Duration (How long it must persist)
          </label>

          <div className="flex items-center gap-2 flex-wrap">

            <input
              type="number"
              min="1"
              value={form.condDuration ?? ""}
              onChange={e =>
                setForm(f => ({
                  ...f,
                  condDuration: e.target.value,
                }))
              }
              className="w-20 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
            />

            <SelectBox
              value={durationUnit}
              options={["Seconds", "Minutes", "Hours"]}
              onChange={v =>
                setForm(f => ({
                  ...f,
                  condDurationUnit: v,
                }))
              }
              className="w-28"
            />

            <span className="font-mono text-[11px] text-foreground">
              Evaluation Frequency <span className="text-primary">*</span>
            </span>

            <SelectBox
              value={form.condInterval || "Every 30 seconds"}
              options={[
                "Every 15 seconds",
                "Every 30 seconds",
                "Every 1 minute",
                "Every 5 minutes",
              ]}
              onChange={v =>
                setForm(f => ({
                  ...f,
                  condInterval: v,
                }))
              }
              className="w-44"
            />

          </div>
        </div>

        {/* Occurrences */}

        <div>

          <label className="block font-mono text-[11px] text-foreground mb-1.5">
            Required Occurrences (within the window)
          </label>

          <div className="flex items-center gap-2">

            <input
              type="number"
              min="1"
              value={form.condOccurrences ?? ""}
              onChange={e =>
                setForm(f => ({
                  ...f,
                  condOccurrences: e.target.value,
                }))
              }
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
            />

            <span className="font-mono text-xs text-muted-foreground">
              out of
            </span>

            <input
              type="number"
              min="1"
              value={form.condOutOf ?? ""}
              onChange={e =>
                setForm(f => ({
                  ...f,
                  condOutOf: e.target.value,
                }))
              }
              className="w-16 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
            />

          </div>
        </div>

        {/* Preview */}

        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-1">

          <p className="font-mono text-[10px] uppercase tracking-wider text-primary font-bold">
            Condition Preview
          </p>

          <p className="font-mono text-xs text-foreground">

            {firstMeta.label || "—"}{" "}

            {operatorSymbol[firstCondition?.operator] || ">"}{" "}

            {firstCondition?.threshold || "—"}{" "}

            {firstMeta.unit || ""}{" "}

            for {form.condDuration || "—"} {durationUnit.toLowerCase()}

          </p>

          <p className="font-mono text-[10px] text-muted-foreground">
            Prometheus:{" "}
            <span className="text-primary">
              {firstCondition?.metric || "—"}
            </span>
          </p>

          {conditions.length > 1 && (
            <p className="font-mono text-[10px] text-muted-foreground">
              Plus {conditions.length - 1} additional condition(s).
            </p>
          )}

        </div>

      </div>
    </Panel>
  )
}
