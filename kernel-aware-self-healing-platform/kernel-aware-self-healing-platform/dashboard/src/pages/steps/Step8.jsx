import { Panel } from "@/components/kit"
import { cn } from "@/utils/cn"
import { Toggle, Radio } from "./wizardComponents"

export default function Step8({ form, setForm }) {
  const safety = form.safety || {}

  return (
    <Panel className="p-6">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
          8. Safety (Approval & Permissions)
        </p>

        <p className="text-xs text-muted-foreground mt-0.5">
          Control how and when this action can be executed.
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-md border border-border bg-secondary/10 p-4">
          <div>
            <p className="font-mono text-xs font-semibold text-foreground">
              Automatic Execution
            </p>

            <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
              Allow the system to execute this action automatically.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            <Toggle
              checked={safety.autoExec ?? false}
              onChange={v =>
                setForm(f => ({
                  ...f,
                  safety: {
                    ...f.safety,
                    autoExec: v,
                  },
                }))
              }
            />

            <span className="font-mono text-xs text-foreground">
              {safety.autoExec ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>
        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-3">
            Approval Required
          </p>

          <div className="grid grid-cols-3 gap-3">
            {[
              {
                id: "never",
                label: "Never",
                desc: "Execute without approval",
              },
              {
                id: "high-critical",
                label: "For High / Critical",
                desc: "Requires approval for High or Critical severity",
              },
              {
                id: "always",
                label: "Always",
                desc: "Always require approval before execution",
              },
            ].map(opt => (
              <label
                key={opt.id}
                onClick={() =>
                  setForm(f => ({
                    ...f,
                    safety: {
                      ...f.safety,
                      approvalRequired: opt.id,
                    },
                  }))
                }
                className={cn(
                  "flex flex-col gap-1.5 rounded-md border p-3 cursor-pointer transition-colors",
                  safety.approvalRequired === opt.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs font-semibold text-foreground">
                    {opt.label}
                  </p>

                  <Radio
                    checked={safety.approvalRequired === opt.id}
                  />
                </div>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {opt.desc}
                </p>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-3">
            Allowed During
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                id: "always",
                label: "Always",
                desc: "Actions can run 24/7",
              },
              {
                id: "maintenance-only",
                label: "Maintenance Windows Only",
                desc: "Restrict actions to maintenance windows",
              },
            ].map(opt => (
              <label
                key={opt.id}
                onClick={() =>
                  setForm(f => ({
                    ...f,
                    safety: {
                      ...f.safety,
                      allowedDuring: opt.id,
                    },
                  }))
                }
                className={cn(
                  "flex flex-col gap-1.5 rounded-md border p-3 cursor-pointer transition-colors",
                  safety.allowedDuring === opt.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs font-semibold text-foreground">
                    {opt.label}
                  </p>

                  <Radio
                    checked={safety.allowedDuring === opt.id}
                  />
                </div>

                <p className="font-mono text-[10px] text-muted-foreground">
                  {opt.desc}
                </p>
              </label>
            ))}
          </div>
        </div>

      </div>
    </Panel>
  )
}