import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"

export default function Step4Network({ form, setForm }) {
  // Create the target and metric structure expected by the backend.
  const updateTarget = (field, value) => {
    setForm((prev) => {
      const targetType =
        field === "targetType" ? value : prev.targetType || "Network Interface"

      const networkInterface =
        field === "interface" ? value : prev.interface || "eth0"

      const selectedMetric =
        field === "metric" ? value : prev.metric || "Upload Bandwidth"

      // Preserve conditions only when the selected metric has not changed.
      const oldTarget = prev.targets?.[0]
      const oldMetric = oldTarget?.metrics?.[0]

      const conditions =
        oldMetric?.name === selectedMetric
          ? oldMetric.conditions || []
          : []

      const target = {
        type: targetType,
        name: networkInterface,
        metrics: [
          {
            name: selectedMetric,
            conditions,
          },
        ],
      }

      console.log("Targets:", JSON.stringify([target], null, 2))

      return {
        ...prev,
        [field]: value,
        targets: [target],
      }
    })
  }

  return (
    <Panel className="p-6">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
          4. Target & Metric
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Select the metric and target for this rule.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">
              Metric <span className="text-destructive">*</span>
            </label>
            <SelectBox
              value={form.metric || "Upload Bandwidth"}
              options={[
                "Upload Bandwidth",
                "Download Bandwidth",
                "Incoming Packet Drop Rate",
              ]}
              onChange={(v) => updateTarget("metric", v)}
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">
              Target Type <span className="text-destructive">*</span>
            </label>
            <SelectBox
              value={form.targetType || "Network Interface"}
              options={["Network Interface"]}
              onChange={(v) => updateTarget("targetType", v)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[11px] text-foreground mb-1.5">
                Interface <span className="text-destructive">*</span>
              </label>
              <SelectBox
                value={form.interface || "eth0"}
                options={["eth0", "eth1", "ens33", "wlan0"]}
                onChange={(v) => updateTarget("interface", v)}
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] text-foreground mb-1.5">
                Direction <span className="text-destructive">*</span>
              </label>
              <SelectBox
                value={form.direction || "Incoming"}
                options={["Incoming", "Outgoing", "Both"]}
                onChange={(v) =>
                  setForm((prev) => ({ ...prev, direction: v }))
                }
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">
              Aggregation <span className="text-destructive">*</span>
            </label>
            <SelectBox
              value={form.aggregation || "Average (60s)"}
              options={[
                "Average (60s)",
                "Maximum (60s)",
                "Sum (60s)",
              ]}
              onChange={(v) =>
                setForm((prev) => ({ ...prev, aggregation: v }))
              }
            />
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              How values are aggregated for evaluation.
            </p>
          </div>
        </div>

        <div className="col-span-1">
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4 h-full">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary mb-2">
              About {form.metric || "Upload Bandwidth"}
            </p>

            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              {form.metric === "Incoming Packet Drop Rate"
                ? "Percentage of received network packets reported as dropped on the selected interface."
                : form.metric === "Download Bandwidth"
                  ? "Rate of bytes received by the selected network interface."
                  : "Rate of bytes sent by the selected network interface."}
            </p>

            <p className="mt-3 font-mono text-[10px] text-muted-foreground leading-relaxed">
              The actual measurement and aggregation must be supported by your monitoring pipeline.
            </p>
          </div>
        </div>
      </div>
    </Panel>
  )
}
