import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"

const METRICS = [
  "CPU Usage (%)",
  "Memory Usage (%)",
  "Disk Usage (%)",
  "Network Usage (%)",
]

const OPERATORS = [
  "Greater Than (>)",
  "Less Than (<)",
  "Equals (=)",
]

const INTERVALS = [
  "Every 30 seconds",
  "Every 1 minute",
  "Every 5 minutes",
]

export default function Step5Cpu({ form, setForm }) {
  const conditions = form.conditions || []

  const addMetric = (metric) => {
    if (!metric || conditions.some(c => c.metric === metric)) return

    setForm(f => ({
      ...f,
      conditions: [
        ...(f.conditions || []),
        {
          metric,
          operator: "Greater Than (>)",
          threshold: "",
          duration: "5",
          durationUnit: "Minutes",
          interval: "Every 1 minute",
          occurrences: "1",
          outOf: "1",
        },
      ],
    }))
  }

  const updateCondition = (index, field, value) => {
    setForm(f => ({
      ...f,
      conditions: (f.conditions || []).map((condition, i) =>
        i === index
          ? { ...condition, [field]: value }
          : condition
      ),
    }))
  }

  const removeMetric = (index) => {
    setForm(f => ({
      ...f,
      conditions: (f.conditions || []).filter((_, i) => i !== index),
    }))
  }

  const availableMetrics = METRICS.filter(
    metric => !conditions.some(c => c.metric === metric)
  )

  return (
    <Panel className="p-6">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
          5. Conditions (When)
        </p>

        <p className="text-xs text-muted-foreground mt-0.5">
          Define one or more conditions that must trigger this rule.
        </p>
      </div >
      <div style={{ display: "flex", flexDirection: "row" , justifyContent: "space-around" , gap:"40px"}}>
      <div className="space-y-5" style={{flex: "3"}}>

        {/* ADD METRIC */}
        <div>
          <label className="block font-mono text-[11px] text-foreground mb-2">
            Select Metrics
          </label>

          <SelectBox
            value=""
            options={
              availableMetrics.length > 0
                ? ["Select a metric...", ...availableMetrics]
                : ["All metrics selected"]
            }
            onChange={v => {
              if (v !== "Select a metric..." && v !== "All metrics selected") {
                addMetric(v)
              }
            }}
            className="w-full"
          />
        </div>

        {/* SELECTED CONDITIONS */}
        {conditions.length > 0 && (
          <div className="space-y-4">

            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Selected Metrics
            </p>

            {conditions.map((condition, index) => (
              <div
                key={condition.metric}
                className="rounded-md border border-border bg-card p-4"
              >

                {/* HEADER */}
                <div className="flex items-center justify-between mb-4">
                  <p className="font-mono text-xs font-bold text-primary">
                    {condition.metric}
                  </p>

                  <button
                    type="button"
                    onClick={() => removeMetric(index)}
                    className="font-mono text-[10px] text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "row" , justifyContent: "space-between" , gap:"50px"}}>
                <div className="mb-4">
                  <label className="block font-mono text-[10px] text-muted-foreground mb-2">
                    Operator & Threshold
                  </label>

                  <div className="flex items-center gap-2 flex-wrap">
                    <SelectBox
                      value={condition.operator}
                      options={OPERATORS}
                      onChange={v =>
                        updateCondition(index, "operator", v)
                      }
                      className="w-44"
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
                      className="w-20 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
                      placeholder="80"
                    />

                    <span className="font-mono text-xs text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>

                {/* DURATION */}
                <div className="mb-4">
                  <label className="block font-mono text-[10px] text-muted-foreground mb-2">
                    Duration
                  </label>

                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="number"
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
                      options={["Seconds", "Minutes", "Hours"]}
                      onChange={v =>
                        updateCondition(
                          index,
                          "durationUnit",
                          v
                        )
                      }
                      className="w-28"
                    />

                    <SelectBox
                      value={condition.interval}
                      options={INTERVALS}
                      onChange={v =>
                        updateCondition(index, "interval", v)
                      }
                      className="w-40"
                    />
                  </div>
                </div>
              </div>
              </div>
            ))}
          </div>
        )}

        {/* PREVIEW */}
        {conditions.length > 0 && (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-primary mb-2 font-bold">
              Condition Preview
            </p>

            <div className="space-y-1">
              {conditions.map((condition, index) => (
                <p
                  key={condition.metric}
                  className="font-mono text-xs text-foreground"
                >
                  {condition.metric}{" "}
                  {condition.operator.replace(
                    "Greater Than",
                    ">"
                  ).replace(
                    "Less Than",
                    "<"
                  ).replace(
                    "Equals",
                    "="
                  ).replace(/[()]/g, "")}{" "}
                  {condition.threshold}% for{" "}
                  {condition.duration}{" "}
                  {condition.durationUnit.toLowerCase()}
                  {" "}({condition.occurrences} out of{" "}
                  {condition.outOf})
                  {index < conditions.length - 1 && (
                    <span className="text-primary font-bold">
                      {" AND"}
                    </span>
                  )}
                </p>
              ))}
            </div>
          </div>
        )}

      </div>
      <div style={{flex:"1"}}>
        <div style={{height:"100%"}}>
          <div style={{height:"100%"}}>
            <div className="col-span-1" style={{height:"100%"}}>
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4 h-full" style={{height:"100%"}}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary mb-2">About Process Policies and user rules</p>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              Analyze and Detect abnormal behavior or rule violations on selected processes to Make a decision based on configured policies, then automatically execute appropriate recovery actions and verify whether the system has successfully returned to a healthy state.
            </p>
            <p className="mt-3 font-mono text-[10px] text-muted-foreground leading-relaxed">How values are aggregated for evaluation.</p>
          </div>
            </div>
        </div>

        </div>
      </div>
      </div>
    </Panel>
  )
}