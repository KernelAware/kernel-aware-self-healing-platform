
import { Panel } from "@/components/kit";
import { SelectBox } from "../wizardComponents";
import { Info } from "lucide-react";

export default function Step10Memory({ form, setForm }) {
  console.log(
    "CURRENT FORM - Step10Memory:\n",
    JSON.stringify(form, null, 2)
  );

  const recoveryMetric = form.recovery?.metric?.[0] || {};

 const updateRecoveryMetric = (updates) => {
  setForm((f) => {
    const currentMetric = f.recovery?.metric?.[0] || {};

    return {
      ...f,
      recovery: {
        ...f.recovery,
        required: true,
        metric: [
          {
            ...currentMetric,
            metric: f.memoryMetric || "",
            operator: currentMetric.operator || "Less Than (<)",
            threshold: currentMetric.threshold ?? "",
            duration: currentMetric.duration ?? "",
            durationUnit: currentMetric.durationUnit || "Minutes",
            ...updates,
          },
        ],
      },
    };
  });
};

  return (
    <Panel className="p-6">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
          10. Verification & Recovery
        </p>

        <p className="text-xs text-muted-foreground mt-0.5">
          How recovery is detected for this rule.
        </p>
      </div>

      <div className="space-y-5">
        <div className="flex gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
          <Info className="size-4 text-primary shrink-0 mt-0.5" />

          <p className="font-mono text-[11px] text-foreground">
            Verification is not required for Alert-only actions.
            <br />
            Set recovery condition to auto-resolve incidents.
          </p>
        </div>

        {/* Recovery Condition */}
        <div>
          <label className="block font-mono text-xs font-semibold text-foreground mb-2">
            Recovery Condition
          </label>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Selected metric from Step 4 */}
            <input
              type="text"
              value={form.memoryMetric || ""}
              readOnly
              className="flex-1 min-w-[140px] rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground focus:outline-none"
            />

            {/* Recovery operator */}
            <SelectBox
              value={recoveryMetric.operator || "Less Than (<)"}
              options={["Less Than (<)", "Greater Than (>)"]}
              onChange={(value) =>
                updateRecoveryMetric({
                  operator: value,
                })
              }
              className="w-36"
            />

            {/* Recovery threshold */}
            <input
              type="number"
              value={recoveryMetric.threshold ?? ""}
              onChange={(e) =>
                updateRecoveryMetric({
                  threshold: e.target.value,
                })
              }
              className="w-20 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
            />

            <span className="font-mono text-xs text-muted-foreground">
              {form.memoryMetric?.includes("bytes") ? "Bytes" : "%"}
            </span>
          </div>
        </div>

        {/* Recovery Duration */}
        <div>
          <label className="block font-mono text-xs font-semibold text-foreground mb-2">
            Duration
          </label>

          <div className="flex items-center gap-2">
            <input
              type="number"
              value={recoveryMetric.duration ?? ""}
              onChange={(e) =>
                updateRecoveryMetric({
                  duration: e.target.value,
                })
              }
              className="w-20 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
            />

            <SelectBox
              value={recoveryMetric.durationUnit || "Minutes"}
              options={["Seconds", "Minutes"]}
              onChange={(value) =>
                updateRecoveryMetric({
                  durationUnit: value,
                })
              }
              className="w-28"
            />
          </div>

          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            Condition must be met for the duration before the incident is
            marked as recovered.
          </p>
        </div>
      </div>
    </Panel>
  );
}

