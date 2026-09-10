import React from "react"
import { ChevronDown, X, Check, ArrowLeft, ArrowRight } from "lucide-react"
import { cn } from "@/utils/cn"
import { STEP_DEFS } from "./wizardConstants"

export function Toggle({ checked, onChange }) {
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors", checked ? "bg-primary" : "bg-secondary")}>
      <span className={cn("pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
    </button>
  )
}

export function TagPill({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-[#162026] border border-white/5 px-2 py-1 font-mono text-[12px] text-foreground">
      {label}<button onClick={onRemove} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="size-3" /></button>
    </span>
  )
}

export function Radio({ checked }) {
  return (
    <div className={cn("size-4 rounded-full border-2 flex items-center justify-center shrink-0", checked ? "border-primary" : "border-muted-foreground/50")}>
      {checked && <div className="size-2 rounded-full bg-primary" />}
    </div>
  )
}

export function Checkbox({ checked, onClick }) {
  return (
    <div onClick={onClick} className={cn("size-4 rounded border flex items-center justify-center cursor-pointer transition-colors shrink-0", checked ? "bg-primary border-primary" : "border-border bg-card")}>
      {checked && <Check className="size-2.5 text-primary-foreground" />}
    </div>
  )
}

export function SelectBox({ value, options, onChange, className }) {
  return (
    <div className={cn("relative", className)}>
      <select value={value} onChange={e => onChange && onChange(e.target.value)}
        className="w-full appearance-none rounded-md border border-border bg-card px-3 pr-8 py-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none cursor-pointer">
        {options.map(o => <option key={o} className="bg-card">{o}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
    </div>
  )
}

export function WizardProgress({ current }) {
  return (
    <div className="flex items-center justify-between pt-2 pb-6 px-6 overflow-x-auto relative mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {STEP_DEFS.map((s, i) => {
        const done = s.num < current
        const active = s.num === current
        return (
          <React.Fragment key={s.num}>
            <div className="flex flex-col items-center gap-2 relative z-10 shrink-0">
              <div className={cn("flex size-8 items-center justify-center rounded-full border text-xs font-bold transition-all",
                active ? "border-primary bg-primary text-primary-foreground shadow-glow-primary" :
                done ? "border-primary/50 bg-primary/10 text-primary" :
                "border-border bg-card text-muted-foreground"
              )}>
                {s.num}
              </div>
              <span className={cn("font-mono text-[10px] whitespace-nowrap absolute -bottom-6",
                active ? "text-primary font-bold" : done ? "text-foreground" : "text-muted-foreground"
              )}>
                {s.label}
              </span>
            </div>
            {i < STEP_DEFS.length - 1 && (
              <div className={cn("flex-1 h-px min-w-[20px] transition-colors",
                done ? "bg-primary/50" : "bg-border"
              )} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export function StepNav({ current, onBack, onNext, nextLabel = "Next" }) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <button onClick={onBack} className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-5 font-mono text-xs text-foreground hover:bg-secondary transition-colors cursor-pointer">
        <ArrowLeft className="size-3.5" /> Back
      </button>
      <div className="flex-1"></div>
      <button onClick={onNext} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-5 font-mono text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-glow-primary transition-colors cursor-pointer">
        {nextLabel} <ArrowRight className="size-3.5" />
      </button>
    </div>
  )
}
