import { ChevronDown, ArrowRight } from "lucide-react"
import { Panel } from "@/components/kit"
import { cn } from "@/utils/cn"
import { Toggle, TagPill } from "./wizardComponents"

export default function Step1({ form, setForm, onNext, onCancel }) {
  const addTag = v => { const t = v.trim().toLowerCase(); if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] })); setForm(f => ({ ...f, tagInput: "" })) }
  const removeTag = t => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))
  const PMAP = { Critical: "bg-destructive", High: "bg-destructive", Medium: "bg-accent", Low: "bg-muted-foreground" }
  return (
    <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0">
        <Panel className="p-6">
          <div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">1. BASIC INFORMATION</p><p className="text-xs text-muted-foreground mt-0.5">Define the basic details for your rule.</p></div>
          <div className="space-y-6">
            <div>
              <label className="block font-mono text-[11px] text-foreground mb-1.5">Rule Name <span className="text-destructive">*</span></label>
              <input type="text" value={form.ruleName} maxLength={100} onChange={e => setForm(f => ({ ...f, ruleName: e.target.value }))}
                className="w-full rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none" placeholder="e.g. High Host CPU" />
              <div className="flex justify-between mt-1">
                <span className="font-mono text-[10px] text-muted-foreground">A human-readable name for this rule.</span>
                <span className="font-mono text-[10px] text-muted-foreground">{form.ruleName.length} / 100</span>
              </div>
            </div>
            <div>
              <label className="block font-mono text-[11px] text-foreground mb-1.5">Description</label>
              <textarea value={form.description} maxLength={255} rows={3} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full resize-none rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none" />
              <div className="flex justify-end"><span className="font-mono text-[10px] text-muted-foreground">{form.description.length} / 255</span></div>
            </div>
            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className="block font-mono text-[11px] text-foreground mb-1.5">Status</label>
                <div className="flex items-center gap-2.5 rounded-md border border-border bg-card px-3 h-[42px]">
                  <Toggle checked={form.enabled} onChange={v => setForm(f => ({ ...f, enabled: v }))} />
                  <span className="font-mono text-xs text-foreground">{form.enabled ? "Enabled" : "Disabled"}</span>
                </div>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">Enable or disable this rule.</p>
              </div>
              <div>
                <label className="block font-mono text-[11px] text-foreground mb-1.5">Priority <span className="text-destructive">*</span></label>
                <div className="relative">
                  <span className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 inline-block size-2 rounded-full", PMAP[form.priority] || "bg-muted-foreground")} />
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full appearance-none rounded-md border border-border bg-card pl-8 pr-8 py-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none cursor-pointer h-[42px]">
                    {["Critical","High","Medium","Low"].map(p => <option key={p} className="bg-card">{p}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                </div>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">Select the rule priority.</p>
              </div>
              <div>
                <label className="block font-mono text-[11px] text-foreground mb-1.5">Rule Owner <span className="text-destructive">*</span></label>
                <div className="relative">
                  <select value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                    className="w-full appearance-none rounded-md border border-border bg-card px-3 pr-8 py-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none cursor-pointer h-[42px]">
                    {["Admin","DevOps","SRE Team","Security"].map(o => <option key={o} className="bg-card">{o}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                </div>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">Who owns this rule.</p>
              </div>
            </div>
            <div>
              <label className="block font-mono text-[11px] text-foreground mb-1.5">Tags (Optional)</label>
              <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 min-h-[42px]">
                {form.tags.map(t => <TagPill key={t} label={t} onRemove={() => removeTag(t)} />)}
                <input value={form.tagInput} onChange={e => setForm(f => ({ ...f, tagInput: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(form.tagInput) } }}
                  onBlur={() => { if (form.tagInput.trim()) addTag(form.tagInput) }}
                  placeholder="" className="flex-1 min-w-[80px] bg-transparent font-mono text-xs text-foreground focus:outline-none" />
                <ChevronDown className="ml-auto size-3.5 text-muted-foreground shrink-0" />
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">Add tags to categorize this rule.</p>
            </div>
          </div>
          <div className="mt-8 flex items-center justify-between">
            <button onClick={onCancel} className="h-9 rounded-md border border-white/10 bg-[#0d151a] px-5 font-mono text-[13px] text-foreground hover:bg-white/5 transition-colors cursor-pointer">Cancel</button>
            <button onClick={onNext} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-5 font-mono text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-glow-primary transition-colors cursor-pointer">Next <ArrowRight className="size-3.5" /></button>
          </div>
        </Panel>
      </div>
    </div>
  )
}
