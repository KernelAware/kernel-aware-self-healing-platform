import { Info } from "lucide-react"
import { Panel } from "@/components/kit"
import { SelectBox, Checkbox } from "./wizardComponents"

export default function Step9({ form, setForm }) {
  const retry = form.retry || {}

  return (
    <Panel className="p-6">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
          9. Retry & Cooldown
        </p>

        <p className="text-xs text-muted-foreground mt-0.5">
          Configure recovery retry limits and cooldown behavior.
        </p>
      </div>

      <div className="space-y-5">
        <div className="flex gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
          <Info className="size-4 text-primary shrink-0 mt-0.5" />

          <p className="font-mono text-[11px] text-foreground">
            Retry is not applicable for Alert-only actions. Recovery actions
            can be retried up to the configured maximum attempt count.
          </p>
        </div>

        <div
          className="flex flex-row gap-[50px]"
        >
          <div className="flex-1">
            <p className="font-mono text-xs font-semibold text-foreground mb-3">
              Retry Configuration
            </p>

            <div>
              <label className="block font-mono text-[11px] text-foreground mb-1.5">
                Maximum Retry Attempts
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={retry.maxAttempts ?? 0}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      retry: {
                        ...f.retry,
                        maxAttempts: e.target.value,
                      },
                    }))
                  }
                  className="w-20 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
                />

                <span className="font-mono text-xs text-muted-foreground">
                  attempts
                </span>
              </div>

              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                Maximum number of times the recovery action can be retried
                after a failed attempt.
              </p>
            </div>
          </div>

          <div className="flex-1">
            <p className="font-mono text-xs font-semibold text-foreground mb-3">
              Cooldown
            </p>

            <div>
              <label className="block font-mono text-[11px] text-foreground mb-1.5">
                Cooldown Period
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={retry.cooldownMinutes ?? 0}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      retry: {
                        ...f.retry,
                        cooldownMinutes: e.target.value,
                      },
                    }))
                  }
                  className="w-20 rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
                />

                <SelectBox
                  value={retry.cooldownUnit || "Minutes"}
                  options={["Minutes", "Hours"]}
                  onChange={v => {
                    setForm(f => ({
                      ...f,
                      retry: {
                        ...f.retry,
                        cooldownUnit: v,
                      },
                    }))
                  }}
                  className="w-28"
                />
              </div>

              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                Prevent duplicate incidents and repeated recovery attempts
                during this period.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {[
            {
              key: "suppressDuplicates",
              label: "Suppress duplicate incidents during cooldown",
            },
            {
              key: "enableDedup",
              label: "Enable deduplication during cooldown",
            },
          ].map(opt => (
            <label
              key={opt.key}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <Checkbox
                checked={!!retry[opt.key]}
                onClick={() =>
                  setForm(f => ({
                    ...f,
                    retry: {
                      ...f.retry,
                      [opt.key]: !f.retry?.[opt.key],
                    },
                  }))
                }
              />

              <span className="font-mono text-xs text-foreground">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    </Panel>
  )
}