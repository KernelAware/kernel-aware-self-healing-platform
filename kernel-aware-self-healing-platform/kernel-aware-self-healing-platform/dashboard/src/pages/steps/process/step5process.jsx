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
  const conditions =
    form.targets?.find(target => target.type === "process")?.metrics || []
  const addMetric = (metric) => {
    if (!metric) return

    setForm(f => ({
      ...f,

      targets: (f.targets || []).map(target => {

        if (target.type !== "process") {
          return target
        }

        const metrics = target.metrics || []

        if (metrics.some(m => m.name === metric)) {
          return target
        }

        return {
          ...target,

          metrics: [
            ...metrics,

            {
              name: metric,

              conditions: [
                {
                  metric,

                  operator: "Greater Than (>)",

                  threshold: "80",

                  duration: "5",

                  durationUnit: "Minutes"
                },
              ],
            },
          ],
        }
      }),
    }))
  }

  const updateCondition = (metricName, field, value) => {
    setForm(f => ({
      ...f,

      targets: (f.targets || []).map(target => {

        if (target.type !== "process") {
          return target
        }

        return {
          ...target,

          metrics: (target.metrics || []).map(metric => {

            if (metric.name !== metricName) {
              return metric
            }

            return {
              ...metric,

              conditions: (metric.conditions || []).map(condition => ({
                ...condition,
                [field]: value,
              })),
            }
          }),
        }
      }),
    }))
  }

  const removeMetric = (metricName) => {
    setForm(f => ({
      ...f,

      targets: (f.targets || []).map(target => {

        if (target.type !== "process") {
          return target
        }

        return {
          ...target,

          metrics: (target.metrics || []).filter(
            metric => metric.name !== metricName
          ),
        }
      }),
    }))
  }

  const availableMetrics = METRICS.filter(
    metric => !conditions.some(
      selectedMetric => selectedMetric.name === metric
    )
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

      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-around",
          gap: "40px",
        }}
      >

        {/* LEFT SIDE */}
        <div
          className="space-y-5"
          style={{ flex: "3" }}
        >

          <div>

            <label className="block font-mono text-[11px] text-foreground mb-2">
              Select Metrics
            </label>

            <SelectBox
              value=""
              options={
                availableMetrics.length > 0
                  ? [
                      "Select a metric...",
                      ...availableMetrics,
                    ]
                  : [
                      "All metrics selected",
                    ]
              }
              onChange={value => {

                if (
                  value !== "Select a metric..." &&
                  value !== "All metrics selected"
                ) {
                  addMetric(value)
                }

              }}
              className="w-full"
            />

          </div>

          {conditions.length > 0 && (

            <div className="space-y-4">

              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Selected Metrics
              </p>


              {conditions.map(metric => {

                const condition = metric.conditions?.[0]

                if (!condition) {
                  return null
                }

                return (

                  <div
                    key={metric.name}
                    className="rounded-md border border-border bg-card p-4"
                  >

                    <div className="flex items-center justify-between mb-4">

                      <p className="font-mono text-xs font-bold text-primary">
                        {metric.name}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          removeMetric(metric.name)
                        }
                        className="font-mono text-[10px] text-destructive hover:underline"
                      >
                        Remove
                      </button>

                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: "50px",
                      }}
                    >

                      <div className="mb-4">

                        <label className="block font-mono text-[10px] text-muted-foreground mb-2">
                          Operator & Threshold
                        </label>

                        <div className="flex items-center gap-2 flex-wrap">

                          <SelectBox
                            value={condition.operator}
                            options={OPERATORS}
                            onChange={value =>
                              updateCondition(
                                metric.name,
                                "operator",
                                value
                              )
                            }
                            className="w-44"
                          />

                          <input
                            type="number"
                            value={condition.threshold}
                            onChange={e =>
                              updateCondition(
                                metric.name,
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
                                metric.name,
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
                                metric.name,
                                "durationUnit",
                                value
                              )
                            }
                            className="w-28"
                          />

                          <SelectBox
                            value={
                              condition.interval ||
                              "Every 1 minute"
                            }
                            options={INTERVALS}
                            onChange={value =>
                              updateCondition(
                                metric.name,
                                "interval",
                                value
                              )
                            }
                            className="w-40"
                          />

                        </div>

                      </div>

                    </div>


                    <div className="mt-2">

                      <label className="block font-mono text-[10px] text-muted-foreground mb-2">
                        Required Occurrences
                      </label>

                      <div className="flex items-center gap-2">

                        <input
                          type="number"
                          min="1"
                          value={
                            condition.occurrences || "1"
                          }
                          onChange={e =>
                            updateCondition(
                              metric.name,
                              "occurrences",
                              e.target.value
                            )
                          }
                          className="w-20 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
                        />

                        <span className="font-mono text-xs text-muted-foreground">
                          out of
                        </span>

                        <input
                          type="number"
                          min="1"
                          value={
                            condition.outOf || "1"
                          }
                          onChange={e =>
                            updateCondition(
                              metric.name,
                              "outOf",
                              e.target.value
                            )
                          }
                          className="w-20 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
                        />

                      </div>

                    </div>

                  </div>

                )
              })}

            </div>
          )}


          {conditions.length > 0 && (

            <div className="rounded-md border border-primary/20 bg-primary/5 p-3">

              <p className="font-mono text-[10px] uppercase tracking-wider text-primary mb-2 font-bold">
                Condition Preview
              </p>

              <div className="space-y-1">

                {conditions.map((metric, index) => {

                  const condition =
                    metric.conditions?.[0]

                  if (!condition) {
                    return null
                  }

                  let operator = condition.operator

                    ?.replace(
                      "Greater Than",
                      ">"
                    )
                    ?.replace(
                      "Less Than",
                      "<"
                    )
                    ?.replace(
                      "Equals",
                      "="
                    )
                    ?.replace(
                      /[()]/g,
                      ""
                    )

                  return (

                    <p
                      key={metric.name}
                      className="font-mono text-xs text-foreground"
                    >

                      {metric.name}{" "}

                      {operator}{" "}

                      {condition.threshold}%{" "}

                      for{" "}

                      {condition.duration}{" "}

                      {condition.durationUnit?.toLowerCase()}{" "}

                      ({condition.occurrences || "1"} out of{" "}

                      {condition.outOf || "1"})

                      {index < conditions.length - 1 && (

                        <span className="text-primary font-bold">
                          {" AND"}
                        </span>

                      )}

                    </p>

                  )
                })}

              </div>

            </div>

          )}

        </div>


        <div style={{ flex: "1" }}>

          <div
            className="rounded-md border border-primary/20 bg-primary/5 p-4 h-full"
          >

            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary mb-2">
              About Process Policies and User Rules
            </p>

            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              Analyze and detect abnormal behavior or rule
              violations on selected processes to make a
              decision based on configured policies, then
              automatically execute appropriate recovery
              actions and verify whether the system has
              successfully returned to a healthy state.
            </p>

            <p className="mt-3 font-mono text-[10px] text-muted-foreground leading-relaxed">
              How values are aggregated for evaluation.
            </p>

          </div>

        </div>

      </div>

    </Panel>
  )
}