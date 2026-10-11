import { useEffect } from "react"
import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"

export default function Step5Network({ form, setForm }) {
  const selectedMetric =
    form.targets?.[0]?.metrics?.[0]?.name ||
    form.metric ||
    "Upload Bandwidth"

  // Read the condition from the nested form structure.
  const condition = form.targets?.[0]?.metrics?.[0]?.conditions?.[0] || {
    metric: selectedMetric,
    operator: ">",
    threshold: "",
    duration: 2,
    durationUnit: "minutes",
  }

  // Ensure a condition exists, even if the user hasn't changed a field yet.
  useEffect(() => {
    if (form.targets?.[0]?.metrics?.[0]?.conditions?.[0]) {
      return
    }

    setForm((prev) => {
      const targets = [...(prev.targets || [])]

      const target = {
        ...(targets[0] || {
          type: prev.targetType || "Network Interface",
          name: prev.interface || "eth0",
        }),
      }

      const metrics = [...(target.metrics || [])]

      const metric = {
        ...(metrics[0] || {
          name: prev.metric || "Upload Bandwidth",
        }),
      }

      const conditions = [...(metric.conditions || [])]

      // Another update may already have initialized the condition.
      if (conditions[0]) return prev

      conditions[0] = {
        metric: metric.name,
        operator: ">",
        threshold: "",
        duration: 2,
        durationUnit: "minutes",
      }

      metric.conditions = conditions
      metrics[0] = metric
      target.metrics = metrics
      targets[0] = target

      return {
        ...prev,
        targets,
      }
    })
  }, [
    form.targets,
    form.metric,
    form.interface,
    form.targetType,
    setForm,
  ])

  // Update the first condition without replacing the rest of the form.
  const updateCondition = (field, value) => {
    setForm((prev) => {
      const targets = [...(prev.targets || [])]

      const target = {
        ...(targets[0] || {
          type: prev.targetType || "Network Interface",
          name: prev.interface || "eth0",
        }),
      }

      const metrics = [...(target.metrics || [])]

      const metric = {
        ...(metrics[0] || {
          name: prev.metric || "Upload Bandwidth",
        }),
      }

      const conditions = [...(metric.conditions || [])]

      const currentCondition = conditions[0] || {
        metric: metric.name,
        operator: ">",
        threshold: "",
        duration: 2,
        durationUnit: "minutes",
      }

      conditions[0] = {
        ...currentCondition,
        [field]: value,
        // Always associate the condition with the Step 4 metric.
        metric: metric.name,
      }

      metric.conditions = conditions
      metrics[0] = metric
      target.metrics = metrics
      targets[0] = target

      console.log(
        "Updated targets:",
        JSON.stringify(targets, null, 2)
      )

      return {
        ...prev,
        targets,
      }
    })
  }

  const operatorLabels = {
    ">": "Greater Than (>)",
    "<": "Less Than (<)",
    "=": "Equals (=)",
  }

  const operatorValues = {
    "Greater Than (>)": ">",
    "Less Than (<)": "<",
    "Equals (=)": "=",
  }

  const unit =
    selectedMetric === "Incoming Packet Drop Rate" ? "%" : "B/s"

  const durationUnitLabel =
    condition.durationUnit.charAt(0).toUpperCase() +
    condition.durationUnit.slice(1)

  return (
    <Panel className="p-6">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
          5. Conditions (When)
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Define when this rule should trigger.
        </p>
      </div>

      <div className="space-y-5">
        {/* Metric, operator and threshold */}
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="flex-1">
              <label className="block font-mono text-[11px] text-foreground">
                Metric
              </label>
            </div>

            <div className="w-44">
              <label className="block font-mono text-[11px] text-foreground">
                Operator
              </label>
            </div>

            <div className="w-32">
              <label className="block font-mono text-[11px] text-foreground">
                Threshold
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-[140px] rounded-md border border-border bg-secondary/40 px-3 py-2.5 font-mono text-xs text-foreground">
              {selectedMetric}
            </div>

            <SelectBox
              value={
                operatorLabels[condition.operator] ||
                operatorLabels[">"]
              }
              options={[
                "Greater Than (>)",
                "Less Than (<)",
                "Equals (=)",
              ]}
              onChange={(value) =>
                updateCondition("operator", operatorValues[value])
              }
              className="w-44"
            />

            <div className="flex items-center gap-2 w-32">
              <input
                type="number"
                min="0"
                value={condition.threshold ?? ""}
                onChange={(e) =>
                  updateCondition("threshold", e.target.value)
                }
                className="w-20 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
              />

              <span className="font-mono text-xs text-muted-foreground">
                {unit}
              </span>
            </div>
          </div>
        </div>

        {/* Duration and evaluation frequency */}
        <div>
          <label className="block font-mono text-[11px] text-foreground mb-1.5">
            Duration (How long it must persist)
          </label>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="number"
              min="1"
              value={condition.duration ?? 2}
              onChange={(e) =>
                updateCondition("duration", e.target.value)
              }
              className="w-20 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
            />

            <SelectBox
              value={durationUnitLabel}
              options={["Seconds", "Minutes", "Hours"]}
              onChange={(value) =>
                updateCondition("durationUnit", value.toLowerCase())
              }
              className="w-28"
            />

            <div className="w-4" />

            <span className="font-mono text-[11px] text-foreground">
              Evaluation Frequency
              <span className="text-primary"> *</span>
            </span>

            <SelectBox
              value={form.condInterval || "Every 30 seconds"}
              options={[
                "Every 20 seconds",
                "Every 30 seconds",
                "Every 1 minute",
              ]}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  condInterval: value,
                }))
              }
              className="w-40"
            />
          </div>
        </div>

        {/* Required occurrences */}
        <div>
          <label className="block font-mono text-[11px] text-foreground mb-1.5">
            Required Occurrences (within the window)
          </label>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={form.condOccurrences ?? 1}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  condOccurrences: e.target.value,
                }))
              }
              className="w-20 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
            />

            <span className="font-mono text-xs text-muted-foreground">
              out of
            </span>

            <input
              type="number"
              min="1"
              value={form.condOutOf ?? 1}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  condOutOf: e.target.value,
                }))
              }
              className="w-20 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary mb-1 font-bold">
            Condition Preview
          </p>

          <p className="font-mono text-xs text-foreground">
            {selectedMetric} {condition.operator}{" "}
            {condition.threshold === "" ||
            condition.threshold == null
              ? "(enter threshold)"
              : condition.threshold}{" "}
            {unit} for {condition.duration} {condition.durationUnit}
          </p>
        </div>
      </div>
    </Panel>
  )
}
