import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"
import { Info, X, Plus } from "lucide-react"

const NETWORK_METRICS = [
  "Error Rate (errors/sec)",
  "Packet Loss (%)",
]

const DEFAULT_METRICS = [
  "CPU Usage (%)",
  "Memory Usage (%)",
  "Disk Usage (%)",
]

const OPERATORS = [
  "Less Than (<)",
  "Greater Than (>)",
]

const getUnit = metric => {
  return metric === "Error Rate (errors/sec)"
    ? "errors/sec"
    : "%"
}

export default function Step10({ form, setForm }) {
  const isNetwork = form.monitorSource === "network"

  const metricOptions = isNetwork
    ? NETWORK_METRICS
    : DEFAULT_METRICS

  const conditions = Array.isArray(form.recovery?.metric)
    ? form.recovery.metric
    : []

  const availableMetrics = metricOptions.filter(
    metric => !conditions.some(condition => condition.metric === metric)
  )

  const addCondition = () => {
    if (availableMetrics.length === 0) return

    const metric = availableMetrics[0]

    setForm(f => ({
      ...f,
      recovery: {
        ...f.recovery,
        metric: [
          ...(Array.isArray(f.recovery?.metric)
            ? f.recovery.metric
            : []),
          {
            metric,
            operator: "Less Than (<)",
            threshold: "",
            duration: "5",
            durationUnit: "Minutes",
          },
        ],
      },
    }))
  }

  const updateCondition = (index, field, value) => {
    setForm(f => ({
      ...f,
      recovery: {
        ...f.recovery,
        metric: (Array.isArray(f.recovery?.metric)
          ? f.recovery.metric
          : []
        ).map((condition, i) =>
          i === index
            ? {
                ...condition,
                [field]: value,
              }
            : condition
        ),
      },
    }))
  }

  const removeCondition = index => {
    setForm(f => ({
      ...f,
      recovery: {
        ...f.recovery,
        metric: (Array.isArray(f.recovery?.metric)
          ? f.recovery.metric
          : []
        ).filter((_, i) => i !== index),
      },
    }))
  }

  const getOperatorSymbol = operator => {
    if (!operator) return ""

    return operator
      .replace("Less Than", "<")
      .replace("Greater Than", ">")
      .replace(/[()]/g, "")
      .trim()
  }

  const getPreview = () => {
    if (conditions.length === 0) {
      return "No custom recovery verification configured. The system will use the opposite of the Step 5 conditions."
    }

    return conditions
      .map(condition => {
        const operator = getOperatorSymbol(condition.operator)
        const unit = getUnit(condition.metric)

        return `${condition.metric} ${operator} ${
          condition.threshold || "?"
        } ${unit} for ${
          condition.duration || "?"
        } ${(condition.durationUnit || "minutes").toLowerCase()}`
      })
      .join(" AND ")
  }

  return (
    <Panel className="p-6">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
          10. Verification & Recovery
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
              If no recovery verification is configured, the system
              automatically uses the opposite of the conditions defined in
              Step 5.
            </p>

            <p className="font-mono text-[10px] text-muted-foreground mt-1">
              Add recovery conditions only when you want to explicitly define
              different values for recovery verification.
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
                All configured recovery conditions must be satisfied before
                the incident is marked as recovered.
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
                  Step 5 conditions will automatically be inverted for
                  recovery verification.
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
                      options={metricOptions}
                      onChange={value =>
                        updateCondition(
                          index,
                          "metric",
                          value
                        )
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] text-muted-foreground mb-1.5">
                      Recovery Threshold
                    </label>

                    <div className="flex items-center gap-2">
                      <SelectBox
                        value={condition.operator}
                        options={OPERATORS}
                        onChange={value =>
                          updateCondition(
                            index,
                            "operator",
                            value
                          )
                        }
                        className="w-40"
                      />

                      <input
                        type="number"
                        min="0"
                        value={condition.threshold}
                        onChange={e =>
                          updateCondition(
                            index,
                            "threshold",
                            e.target.value
                          )
                        }
                        placeholder="80"
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
                        onChange={e =>
                          updateCondition(
                            index,
                            "duration",
                            e.target.value
                          )
                        }
                        className="w-20 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
                      />

                      <SelectBox
                        value={condition.durationUnit}
                        options={[
                          "Seconds",
                          "Minutes",
                          "Hours",
                        ]}
                        onChange={value =>
                          updateCondition(
                            index,
                            "durationUnit",
                            value
                          )
                        }
                        className="w-28"
                      />
                    </div>
                  </div>

                </div>

                <p className="mt-3 font-mono text-[10px] text-muted-foreground">
                  This condition must remain satisfied for the configured
                  duration before the incident is marked as recovered.
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
              : `recovery.metric = ${conditions.length} condition${
                  conditions.length > 1 ? "s" : ""
                }`}
          </p>
        </div>

      </div>
    </Panel>
  )
}