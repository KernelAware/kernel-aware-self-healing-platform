
import { useEffect, useRef, useState } from "react"
import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"

const PROCESSES = [
  {
    name: "nginx",
    pid: "1245",
    status: "Running",
    cpu: "2.4%",
    memory: "1.2%",
    threads: 12,
    executable: "/usr/sbin/nginx",
  },
  {
    name: "python",
    pid: "2187",
    status: "Running",
    cpu: "8.7%",
    memory: "3.4%",
    threads: 8,
    executable: "/usr/bin/python3",
  },
  {
    name: "java",
    pid: "3421",
    status: "Running",
    cpu: "14.2%",
    memory: "12.8%",
    threads: 32,
    executable: "/usr/bin/java",
  },
  {
    name: "postgres",
    pid: "1567",
    status: "Running",
    cpu: "4.1%",
    memory: "6.2%",
    threads: 18,
    executable: "/usr/bin/postgres",
  },
  {
    name: "node",
    pid: "4218",
    status: "Running",
    cpu: "5.8%",
    memory: "4.7%",
    threads: 10,
    executable: "/usr/bin/node",
  },
  {
    name: "sshd",
    pid: "892",
    status: "Running",
    cpu: "0.1%",
    memory: "0.3%",
    threads: 1,
    executable: "/usr/sbin/sshd",
  },
  {
    name: "docker",
    pid: "1024",
    status: "Running",
    cpu: "1.8%",
    memory: "2.1%",
    threads: 14,
    executable: "/usr/bin/dockerd",
  },
  {
    name: "redis",
    pid: "1128",
    status: "Running",
    cpu: "2.1%",
    memory: "1.8%",
    threads: 6,
    executable: "/usr/bin/redis-server",
  },
]

const METRICS = [
  "Process Status",
  "CPU Usage",
  "Memory Usage",
  "Memory RSS",
  "Thread Count",
  "Process Count",
]

export default function Step4Process({ form, setForm }) {
  const [processSearch, setProcessSearch] = useState("")
  const [showProcessList, setShowProcessList] = useState(false)
  const processBoxRef = useRef(null)

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

  const selectedTargets = Array.isArray(form.targets)
    ? form.targets
    : []

  const selectedProcesses = PROCESSES.filter((process) =>
  selectedTargets.some(
    target => target.type === "process" && target.name === process.name
  )
)

  const filteredProcesses = PROCESSES.filter((process) =>
    process.name.toLowerCase().includes(processSearch.toLowerCase())
  )

  const handleProcessChange = (processName) => {
  setForm(f => {
    const current = Array.isArray(f.targets) ? f.targets : []

    const exists = current.some(
      process => process.type === "process" && process.name === processName
    )

    if (exists) {
      return {
        ...f,
        targets: current.filter(
          process => !(process.type === "process" && process.name === processName)
        )
      }
    }

    return {
      ...f,
      targets: [
        ...current,
        {
          type: "process",
          name: processName,
          host: "web-01.prod.local",
          metrics: []
        }
      ]
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
          Select one or more processes and the metric to monitor.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">
              Target Processes{" "}
              <span className="text-destructive">*</span>
            </label>

            {/* Search + Dropdown */}
            <div
              ref={processBoxRef}
              className="relative"
            >

              {/* Search Input */}
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

              {/* Process Dropdown */}
              {showProcessList && (
                <div className="absolute z-50 left-0 right-0 mt-1 border rounded-md bg-background shadow-lg max-h-[220px] overflow-y-auto">

                  {filteredProcesses.length === 0 ? (

                    <p className="px-3 py-3 font-mono text-[11px] text-muted-foreground">
                      No matching processes.
                    </p>

                  ) : (

                    filteredProcesses.map((process) => {
                      const selected = selectedTargets.some(
                        target => target.type === "process" && target.name === process.name
                      )

                      return (
                        <button
                          key={process.name}
                          type="button"
                          onClick={() => {
                            handleProcessChange(process.name)
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

            {selectedTargets.filter(target => target.type === "process").length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedTargets
                  .filter(target => target.type === "process")
                  .map((target) => (
                    <button
                      key={target.name}
                      type="button"
                      onClick={() => handleProcessChange(target.name)}
                      className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 font-mono text-[10px] text-primary hover:bg-primary/20"
                    >
                      <span>
                        {target.name}
                      </span>

                      <span className="text-muted-foreground">
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

          {/* Metric */}
          <div className="col-span-1">

          <div
            className="rounded-md border border-primary/20 bg-primary/5 p-4 h-full"
            style={{
              overflowY: "auto",
              maxHeight: "385px",
            }}
          >

            {/* Header */}
            <div className="flex items-center justify-between mb-3">

              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                Selected Processes
              </p>

              <span className="font-mono text-[10px] text-muted-foreground">
                {selectedProcesses.length} selected
              </span>

            </div>

            {/* Empty State */}
            {selectedProcesses.length === 0 ? (

              <p className="font-mono text-[11px] text-muted-foreground">
                No processes selected.
              </p>

            ) : (

              <div className="space-y-3">

                {selectedProcesses.map((process) => (

                  <div
                    key={process.name}
                    className="rounded-md border border-primary/10 bg-background/50 p-3"
                    style={{ display: "flex", flexDirection: "row" , justifyContent: "space-around"}}
                  >

                    {/* Process Header */}
                    <div className="flex items-center justify-between mb-2" >

                      <p className="font-mono text-[12px] font-bold text-foreground">
                        {process.name}
                      </p>

                    </div>

                    <div className="grid grid-cols-2 gap-y-2 font-mono text-[10px]" style={{ display: "flex", flexDirection: "row" , justifyContent: "space-between" , gap:"30px"}}>

                      <div>
                        <p className="text-muted-foreground">
                          PID
                        </p>

                        <p className="text-foreground">
                          {process.pid}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">
                          Status
                        </p>

                        <p className="text-foreground">
                          {process.status}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">
                          CPU
                        </p>

                        <p className="text-foreground">
                          {process.cpu}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">
                          Memory
                        </p>

                        <p className="text-foreground">
                          {process.memory}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">
                          Threads
                        </p>

                        <p className="text-foreground">
                          {process.threads}
                        </p>
                      </div>

                    </div>
                    <button
                        type="button"
                        onClick={() => handleProcessChange(process.name)}
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
          <div style={{height:"100%"}}>
          <div style={{height:"100%"}}>
            <div className="col-span-1" style={{height:"100%"}}>
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4 h-full" style={{height:"100%"}}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary mb-2">About Process Policies and user rules</p>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              Analyze and Detect abnormal behavior or rule violations on selected processes to Make a decision based on configured policies, then automatically execute appropriate recovery actions and verify whether the system has successfully returned to a healthy state.
            </p>
            <p className="mt-3 font-mono text-[10px] text-muted-foreground leading-relaxed">How values are aggregated for evaluation.</p>
          </div>
            </div>
        </div>

        </div>
      </div>
    </Panel>
  )
}
