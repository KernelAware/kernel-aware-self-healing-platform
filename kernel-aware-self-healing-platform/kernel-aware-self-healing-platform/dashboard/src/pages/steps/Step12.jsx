import { Globe, ChevronDown } from "lucide-react"
import { Panel } from "@/components/kit"
import { cn } from "@/utils/cn"
import { Radio, Checkbox } from "./wizardComponents"

const ACTIVATION_OPTIONS = [
  {
    id: "Always Active",
    label: "Always Active",
    desc: "Runs rule 24/7 without interruption.",
  },
  {
    id: "Custom Schedule",
    label: "Custom Schedule",
    desc: "Set specific days and times.",
  },
]

const TIMEZONES = [
  {
    id: "UTC",
    label: "(UTC) Coordinated Universal Time",
  },
  {
    id: "Asia/Colombo",
    label: "(UTC+5:30) Sri Lanka Standard Time",
  },
  {
    id: "Asia/Kolkata",
    label: "(UTC+5:30) India Standard Time",
  },
  {
    id: "America/New_York",
    label: "(UTC-5:00) Eastern Standard Time",
  },
]

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

export default function Step12({ form, setForm }) {
  const schedule = form.schedule || {}

  const activation = schedule.activation || "Always Active"
  const timezone = schedule.timezone || "UTC"
  const days = Array.isArray(schedule.days)
    ? schedule.days
    : []

  const suppressMaintenance =
    schedule.suppressMaintenance ?? false

  const toggleDay = day => {
    setForm(f => {
      const currentDays = Array.isArray(f.schedule?.days)
        ? f.schedule.days
        : []

      const updatedDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day]

      return {
        ...f,
        schedule: {
          ...f.schedule,
          days: updatedDays,
        },
      }
    })
  }

  return (
    <Panel className="p-6">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
          12. Schedule
        </p>

        <p className="text-xs text-muted-foreground mt-0.5">
          When should this rule be active?
        </p>
      </div>

      <div className="space-y-6">

        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-3">
            Activation
          </p>

          <div className="grid grid-cols-2 gap-3">
            {ACTIVATION_OPTIONS.map(option => {
              const selected = activation === option.id

              return (
                <label
                  key={option.id}
                  onClick={() =>
                    setForm(f => ({
                      ...f,
                      schedule: {
                        ...f.schedule,
                        activation: option.id,
                      },
                    }))
                  }
                  className={cn(
                    "flex flex-col gap-1.5 rounded-md border p-4 cursor-pointer transition-colors",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xs font-semibold text-foreground">
                      {option.label}
                    </p>

                    <Radio checked={selected} />
                  </div>

                  <p className="font-mono text-[10px] text-muted-foreground">
                    {option.desc}
                  </p>
                </label>
              )
            })}
          </div>
        </div>

        {activation === "Custom Schedule" && (
          <div className="space-y-4">

            <div>
              <p className="font-mono text-xs font-semibold text-foreground mb-3">
                Active Days
              </p>

              <div className="grid grid-cols-4 gap-2">
                {DAYS.map(day => {
                  const selected = days.includes(day)

                  return (
                    <label
                      key={day}
                      className={cn(
                        "flex items-center gap-2 rounded-md border p-2.5 cursor-pointer transition-colors",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <Checkbox
                        checked={selected}
                        onClick={() => toggleDay(day)}
                      />

                      <span className="font-mono text-[10px] text-foreground">
                        {day}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-4">

              <div className="flex-1">
                <label className="block font-mono text-xs font-semibold text-foreground mb-2">
                  Start Time
                </label>

                <input
                  type="time"
                  value={schedule.startTime || ""}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      schedule: {
                        ...f.schedule,
                        startTime: e.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none"
                />
              </div>

              <div className="flex-1">
                <label className="block font-mono text-xs font-semibold text-foreground mb-2">
                  End Time
                </label>

                <input
                  type="time"
                  value={schedule.endTime || ""}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      schedule: {
                        ...f.schedule,
                        endTime: e.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-md border border-border bg-card px-3 py-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none"
                />
              </div>

            </div>

          </div>
        )}

        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-3">
            Maintenance Mode
          </p>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox
              checked={suppressMaintenance}
              onClick={() =>
                setForm(f => ({
                  ...f,
                  schedule: {
                    ...f.schedule,
                    suppressMaintenance:
                      !(f.schedule?.suppressMaintenance ?? false),
                  },
                }))
              }
            />

            <span className="font-mono text-xs text-foreground">
              Suppress alerts during maintenance windows
            </span>
          </label>
        </div>

        <div>
          <p className="font-mono text-xs font-semibold text-foreground mb-2">
            Timezone
          </p>

          <div className="relative">
            <Globe className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />

            <select
              value={timezone}
              onChange={e =>
                setForm(f => ({
                  ...f,
                  schedule: {
                    ...f.schedule,
                    timezone: e.target.value,
                  },
                }))
              }
              className="w-full appearance-none rounded-md border border-border bg-card pl-9 pr-8 py-2.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none cursor-pointer"
            >
              {TIMEZONES.map(zone => (
                <option key={zone.id} value={zone.id}>
                  {zone.label}
                </option>
              ))}
            </select>

            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          </div>
        </div>

      </div>
    </Panel>
  )
}