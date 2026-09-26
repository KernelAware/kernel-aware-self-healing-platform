import { Info } from "lucide-react"
import { Panel } from "@/components/kit"
import { cn } from "@/utils/cn"
import { Checkbox } from "../wizardComponents"
import { ACTION_TYPES } from "../wizardConstants"

const CPU_ACTION_IDS = [
  "alert",
  "create-incident",
  "send-notification",
  "run-automation",
  "restart-service",
  "require-approval",
]

const CPU_ACTIONS = CPU_ACTION_IDS.map(id => ACTION_TYPES.find(action => action.id === id))

export default function Step7Cpu({ form, setForm }) {
  const selected = Array.isArray(form.actions) ? form.actions : []

  const toggle = (id) => {
    setForm(currentForm => {
      const current = Array.isArray(currentForm.actions) ? currentForm.actions : []
      const actions = current.includes(id)
        ? current.filter(action => action !== id)
        : [...current, id]

      return { ...currentForm, actions }
    })
  }

  return (
    <Panel className="p-6">
      <div className="mb-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">7. Actions (What to Do)</p>
        <p className="text-xs text-muted-foreground mt-0.5">Select the action type to perform when the condition is triggered.</p>
      </div>
      <p className="font-mono text-[11px] text-foreground mb-3">Action Type <span className="text-destructive">*</span></p>
      <div className="grid grid-cols-3 gap-3">
        {CPU_ACTIONS.map(action => {
          const Icon = action.icon
          const isSelected = selected.includes(action.id)

          return (
            <label
              key={action.id}
              onClick={() => toggle(action.id)}
              className={cn(
                "flex items-center gap-3 rounded-md border p-3.5 cursor-pointer transition-all",
                isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              )}
            >
              <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", action.bg)}>
                <Icon className="size-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs font-semibold text-foreground leading-tight">{action.title}</p>
                <p className="font-mono text-[10px] text-muted-foreground leading-tight mt-0.5">{action.desc}</p>
              </div>
              <Checkbox
                checked={isSelected}
                onClick={event => {
                  event.stopPropagation()
                  toggle(action.id)
                }}
              />
            </label>
          )
        })}
      </div>
      <div className="mt-5 flex gap-2 rounded-md border border-accent/20 bg-accent/5 p-3">
        <Info className="size-4 text-accent shrink-0 mt-0.5" />
        <div>
          <p className="font-mono text-[11px] text-foreground">Note: Target selection (service, process, host, etc.) is handled by the respective domain owner.</p>
          <p className="font-mono text-[11px] text-accent mt-0.5">This policy only defines the action type.</p>
        </div>
      </div>
    </Panel>
  )
}