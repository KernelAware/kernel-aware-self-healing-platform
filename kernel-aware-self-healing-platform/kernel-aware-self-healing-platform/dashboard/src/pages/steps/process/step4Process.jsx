import { useEffect, useRef, useState } from "react"
import { Panel } from "@/components/kit"
import { getProcess } from "@/services/api.js"

const METRICS = [
  "Process Status",
  "CPU Usage",
  "Memory Usage",
  "Memory RSS",
  "Thread Count",
  "Process Count",
]

export default function Step4Process({ form, setForm }) {
  const [processes, setProcesses] = useState([])
  const [processSearch, setProcessSearch] = useState("")
  const [showProcessList, setShowProcessList] = useState(false)

  const processBoxRef = useRef(null)

  // -----------------------------------------
  // Load processes from backend
  // -----------------------------------------
  useEffect(() => {
    async function loadProcesses() {
      try {
        const data = await getProcess(form.system_id || 1)

        setProcesses(data.processes || [])
      } catch (error) {
        console.error("Failed to load processes:", error)
        setProcesses([])
      }
    }

    loadProcesses()
  }, [form.system_id])


  // -----------------------------------------
  // Close dropdown when clicking outside
  // -----------------------------------------
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        processBoxRef.current &&
        !processBoxRef.current.contains(event.target)
      ) {
        setShowProcessList(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [])


  // -----------------------------------------
  // Current selected targets
  // -----------------------------------------
  const selectedTargets = Array.isArray(form.targets)
    ? form.targets
    : []


  // -----------------------------------------
  // Find selected process details
  // -----------------------------------------
  const selectedProcesses = processes.filter((process) =>
    selectedTargets.some(
      (target) =>
        target.type === "process" &&
        target.pid === process.pid
    )
  )


  // -----------------------------------------
  // Search processes
  // -----------------------------------------
  const filteredProcesses = processes.filter((process) =>
    (process.name || "")
      .toLowerCase()
      .includes(processSearch.trim().toLowerCase())
  )


  // -----------------------------------------
  // Select / Remove process
  // -----------------------------------------
  const handleProcessChange = (process) => {
    setForm((f) => {
      const current = Array.isArray(f.targets)
        ? f.targets
        : []

      const exists = current.some(
        (target) =>
          target.type === "process" &&
          target.pid === process.pid
      )

      // Remove if already selected
      if (exists) {
        return {
          ...f,
          targets: current.filter(
            (target) =>
              !(
                target.type === "process" &&
                target.pid === process.pid
              )
          ),
        }
      }

      // Add process
      return {
        ...f,
        targets: [
          ...current,
          {
            type: "process",
            name: process.name,
            pid: process.pid,
            service: process.service,
            metrics: [],
          },
        ],
      }
    })
  }


  return (
    <Panel className="p-6">

      {/* Header */}
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
          4. Target & Metric
        </p>

        <p className="text-xs text-muted-foreground mt-0.5">
          Select one or more processes and the metric to monitor.
        </p>
      </div>


      <div className="grid grid-cols-3 gap-5">

        <div className="col-span-2 space-y-4">

          {/* Process Selection */}
          <div>

            <label className="block font-mono text-[11px] text-foreground mb-1.5">
              Target Processes{" "}
              <span className="text-destructive">*</span>
            </label>


            {/* Search */}
            <div
              ref={processBoxRef}
              className="relative"
            >

              <input
                type="text"
                value={processSearch}
                onChange={(e) => {
                  setProcessSearch(e.target.value)
                  setShowProcessList(true)
                }}
                onFocus={() => setShowProcessList(true)}
                placeholder="Type to search processes..."
                className="w-full border rounded-md bg-background px-3 py-2 font-mono text-[11px] text-foreground outline-none focus:border-primary/50"
              />


              {/* Dropdown */}
              {showProcessList && (

                <div className="absolute z-50 left-0 right-0 mt-1 border rounded-md bg-background shadow-lg max-h-[220px] overflow-y-auto">

                  {filteredProcesses.length === 0 ? (

                    <p className="px-3 py-3 font-mono text-[11px] text-muted-foreground">
                      No matching processes.
                    </p>

                  ) : (

                    filteredProcesses.map((process) => {

                      const selected = selectedTargets.some(
                        (target) =>
                          target.type === "process" &&
                          target.pid === process.pid
                      )

                      return (

                        <button
                          key={process.pid}
                          type="button"
                          onClick={() => {
                            handleProcessChange(process)
                            setProcessSearch("")
                          }}
                          className={`w-full text-left px-3 py-2 font-mono text-[11px] transition flex items-center justify-between ${
                            selected
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted text-foreground"
                          }`}
                        >

                          <div>

                            <span className="font-bold">
                              {process.name}
                            </span>

                            <span className="ml-2 text-muted-foreground">
                              PID {process.pid}
                            </span>

                            {process.recommended && (
                              <span className="ml-2 text-green-500">
                                Recommended
                              </span>
                            )}

                          </div>


                          {selected && (
                            <span className="text-primary font-bold">
                              ✓
                            </span>
                          )}

                        </button>
                      )
                    })
                  )}

                </div>
              )}

            </div>


            {/* Selected Process Tags */}
            {selectedTargets.filter(
              (target) => target.type === "process"
            ).length > 0 && (

              <div className="flex flex-wrap gap-2 mt-2">

                {selectedTargets
                  .filter(
                    (target) => target.type === "process"
                  )
                  .map((target) => (

                    <button
                      key={target.pid}
                      type="button"
                      onClick={() => {
                        const process = processes.find(
                          (p) => p.pid === target.pid
                        )

                        if (process) {
                          handleProcessChange(process)
                        }
                      }}
                      className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 font-mono text-[10px] text-primary hover:bg-primary/20"
                    >

                      <span>
                        {target.name}
                      </span>

                      <span className="text-muted-foreground">
                        PID {target.pid}
                      </span>

                      <span>
                        ×
                      </span>

                    </button>

                  ))}

              </div>
            )}

            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              Type a process name and select multiple processes from the list.
            </p>

          </div>


          {/* Selected Processes Details */}
          <div>

            <div
              className="rounded-md border border-primary/20 bg-primary/5 p-4 h-full"
              style={{
                overflowY: "auto",
                maxHeight: "385px",
              }}
            >

              <div className="flex items-center justify-between mb-3">

                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                  Selected Processes
                </p>

                <span className="font-mono text-[10px] text-muted-foreground">
                  {selectedProcesses.length} selected
                </span>

              </div>


              {selectedProcesses.length === 0 ? (

                <p className="font-mono text-[11px] text-muted-foreground">
                  No processes selected.
                </p>

              ) : (

                <div className="space-y-3">

                  {selectedProcesses.map((process) => (

                    <div
                      key={process.pid}
                      className="rounded-md border border-primary/10 bg-background/50 p-3 flex items-center justify-between gap-5"
                    >

                      {/* Name */}
                      <div>

                        <p className="font-mono text-[12px] font-bold text-foreground">
                          {process.name}
                        </p>

                      </div>


                      {/* PID */}
                      <div>

                        <p className="text-muted-foreground font-mono text-[10px]">
                          PID
                        </p>

                        <p className="text-foreground font-mono text-[10px]">
                          {process.pid}
                        </p>

                      </div>


                      {/* Status */}
                      <div>

                        <p className="text-muted-foreground font-mono text-[10px]">
                          Status
                        </p>

                        <p className="text-foreground font-mono text-[10px]">
                          {process.status}
                        </p>

                      </div>


                      {/* CPU */}
                      <div>

                        <p className="text-muted-foreground font-mono text-[10px]">
                          CPU
                        </p>

                        <p className="text-foreground font-mono text-[10px]">
                          {process.cpu_percent}%
                        </p>

                      </div>


                      {/* Memory */}
                      <div>

                        <p className="text-muted-foreground font-mono text-[10px]">
                          Memory
                        </p>

                        <p className="text-foreground font-mono text-[10px]">
                          {Number(process.memory_percent || 0).toFixed(1)}%
                        </p>

                      </div>


                      {/* Service */}
                      <div>

                        <p className="text-muted-foreground font-mono text-[10px]">
                          Related Service
                        </p>

                        <p className="text-foreground font-mono text-[10px]">
                          {process.service || "None"}
                        </p>

                      </div>


                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() =>
                          handleProcessChange(process)
                        }
                        className="text-[10px] text-destructive hover:underline"
                      >
                        Remove
                      </button>

                    </div>

                  ))}

                </div>
              )}

            </div>

          </div>

        </div>


        {/* Information */}
        <div className="col-span-1">

          <div className="rounded-md border border-primary/20 bg-primary/5 p-4 h-full">

            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary mb-2">
              About Process Policies and User Rules
            </p>

            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              Analyze and detect abnormal behavior or rule violations
              on selected processes, make decisions based on configured
              policies, execute appropriate recovery actions, and verify
              whether the system has returned to a healthy state.
            </p>

          </div>

        </div>

      </div>

    </Panel>
  )
}