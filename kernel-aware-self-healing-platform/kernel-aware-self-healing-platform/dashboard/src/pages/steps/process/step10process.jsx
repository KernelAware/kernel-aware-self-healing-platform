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

const getUnit = (metric) => {
  return metric === "Error Rate (errors/sec)"
    ? "errors/sec"
    : "%"
}

export default function Step10({ form, setForm }) {
  const isNetwork = form.monitorSource === "network"

  const availableMetrics = (
    isNetwork ? NETWORK_METRICS : DEFAULT_METRICS
  ).filter(
    metric =>
      !(form.recoveryConditions || []).some(
        condition => condition.metric === metric
      )
  )

  const conditions = form.recoveryConditions || []

  const addCondition = () => {
    if (availableMetrics.length === 0) return

    const metric = availableMetrics[0]

    setForm(f => ({
      ...f,
      recoveryConditions: [
        ...(f.recoveryConditions || []),
        {
          metric,
          operator: "Less Than (<)",
          threshold: "",
          duration: "5",
          durationUnit: "Minutes",
        },
      ],
    }))
  }

  const updateCondition = (index, field, value) => {
    setForm(f => ({
      ...f,
      recoveryConditions: (f.recoveryConditions || []).map(
        (condition, i) =>
          i === index
            ? { ...condition, [field]: value }
            : condition
      ),
    }))
  }

  const removeCondition = index => {
    setForm(f => ({
      ...f,
      recoveryConditions: (f.recoveryConditions || []).filter(
        (_, i) => i !== index
      ),
    }))
  }

  const getPreview = () => {
    if (conditions.length === 0) {
      return "No recovery conditions configured."
    }

    return conditions
      .map(condition => {
        const operator = condition.operator
          .replace("Less Than", "<")
          .replace("Greater Than", ">")
          .replace(/[()]/g, "")

        const unit = getUnit(condition.metric)

        return `${condition.metric} ${operator} ${
          condition.threshold || "?"
        } ${unit} for ${
          condition.duration || "?"
        } ${condition.durationUnit.toLowerCase()}`
      })
      .join(" AND ")
  }

  return (
    <Panel className="p-6">

      {/* HEADER */}
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
          10. Verification & Recovery
        </p>

        <p className="text-xs text-muted-foreground mt-0.5">
          Define how recovery is verified for this rule.
        </p>
      </div>

      <div className="space-y-5">

        {/* INFO */}
        <div className="flex gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
          <Info className="size-4 text-primary shrink-0 mt-0.5" />

          <p className="font-mono text-[11px] text-foreground">
            If no recovery verification is configured, the system automatically uses the opposite of the conditions
              defined in Step 5 for recovery verification. When recovery verification is configured.
          </p>
        </div>

        {/* RECOVERY PREVIEW */}
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary mb-1 font-bold">
            Recovery Preview
          </p>

          <p className="font-mono text-xs text-foreground leading-relaxed">
            {getPreview()}
          </p>
        </div>

        {/* CONDITIONS */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block font-mono text-xs font-semibold text-foreground">
                Recovery Conditions
              </label>

              <p className="font-mono text-[10px] text-muted-foreground mt-1">
                All conditions must be satisfied to mark the incident as recovered.
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

          {/* CONDITION LIST */}
          <div className="space-y-3">

            {conditions.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-5 text-center">
                <p className="font-mono text-[11px] text-muted-foreground">
                  No recovery conditions added.
                </p>

                <button
                  type="button"
                  onClick={addCondition}
                  disabled={availableMetrics.length === 0}
                  className="mt-2 font-mono text-[10px] text-primary hover:underline disabled:opacity-40"
                >
                  + Add recovery condition
                </button>
              </div>
            )}

            {conditions.map((condition, index) => (
              <div
                key={index}
                className="rounded-md border border-border bg-card p-4"
              >

                {/* CONDITION HEADER */}
                <div className="flex items-center justify-between mb-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-primary font-bold">
                    Condition {index + 1}
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

                {/* METRIC */}
                <div className="mb-4">
                  <label className="block font-mono text-[10px] text-muted-foreground mb-1.5">
                    Metric
                  </label>

                  <SelectBox
                    value={condition.metric}
                    options={
                      isNetwork
                        ? NETWORK_METRICS
                        : DEFAULT_METRICS
                    }
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

                {/* OPERATOR + THRESHOLD */}
                <div className="mb-4">
                  <label className="block font-mono text-[10px] text-muted-foreground mb-1.5">
                    Recovery Threshold
                  </label>

                  <div className="flex items-center gap-2 flex-wrap">

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

                    <span className="font-mono text-xs text-muted-foreground">
                      {getUnit(condition.metric)}
                    </span>

                  </div>
                </div>

                {/* DURATION */}
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

                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    The condition must remain satisfied for this duration
                    before the incident is marked as recovered.
                  </p>
                </div>

              </div>
            ))}

          </div>
        </div>

      </div>
    </Panel>
  )
}