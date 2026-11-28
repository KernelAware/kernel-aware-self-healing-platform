import { useState } from "react"
import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"

const CATEGORIES = {
  "CPU Temperature": {
    metrics: {
      "hardware_cpu_average_temperature_celsius": {
        label: "CPU Average Temperature",
        desc: "Average temperature across all available CPU cores.",
        unit: "°C",
        labels: [],
      },
      "hardware_cpu_max_temperature_celsius": {
        label: "CPU Maximum Core Temperature",
        desc: "Highest temperature recorded among all CPU cores.",
        unit: "°C",
        labels: [],
      },
    },
    color: "text-orange-400",
    bg: "bg-orange-400/10 border-orange-400/20",
  },

  "Cooling": {
    metrics: {
      "hardware_fan_speed_rpm": {
        label: "Fan Speed",
        desc: "Rotational speed of a system cooling fan in revolutions per minute.",
        unit: "RPM",
        labels: ["fan"],
      },
    },
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
  },

  "Disk Hardware Health": {
    metrics: {
      "hardware_disk_temperature_celsius": {
        label: "Disk Temperature",
        desc: "Operating temperature of a physical disk drive obtained from hardware monitoring data.",
        unit: "°C",
        labels: ["device"],
      },
      "hardware_disk_power_on_hours": {
        label: "Disk Power-On Hours",
        desc: "Total number of hours a physical disk has been powered on. Useful for hardware aging and maintenance monitoring.",
        unit: "Hours",
        labels: ["device"],
      },
    },
    color: "text-yellow-400",
    bg: "bg-yellow-400/10 border-yellow-400/20",
  },
}

const LABEL_OPTIONS = {
  fan:    ["Fan 1", "Fan 2", "Fan 3", "All"],
  device: ["/dev/sda", "/dev/sdb", "/dev/nvme0", "All"],
}

export default function Step4Hardware({ form, setForm }) {
  const [category, setCategory] = useState(form.hardwareCategory || "CPU Temperature")
  const catData = CATEGORIES[category]
  const metricKeys = Object.keys(catData.metrics)
  const selectedKey = catData.metrics[form.hardwareMetric] ? form.hardwareMetric : metricKeys[0]
  const info = catData.metrics[selectedKey] || catData.metrics[metricKeys[0]]
  const hasLabels = info.labels.length > 0

  const handleCategory = (v) => {
    setCategory(v)
    const firstKey = Object.keys(CATEGORIES[v].metrics)[0]
    setForm(f => ({ ...f, hardwareCategory: v, hardwareMetric: firstKey, condMetric: firstKey }))
  }

  const handleMetric = (v) => {
    setForm(f => ({ ...f, hardwareMetric: v, condMetric: v }))
  }

  console.log(
  "STEP 4 - HARDWARE METRIC FORM DATA:\n",
  JSON.stringify(form, null, 2)
)

  return (
    <Panel className="p-6">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">4. Target & Metric</p>
        <p className="text-xs text-muted-foreground mt-0.5">Select the hardware metric and target for this rule.</p>
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">

          {/* Category */}
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Hardware Category <span className="text-destructive">*</span></label>
            <SelectBox value={category} options={Object.keys(CATEGORIES)} onChange={handleCategory} />
          </div>

          {/* Metric */}
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Metric <span className="text-destructive">*</span></label>
            <SelectBox value={selectedKey} options={metricKeys} onChange={handleMetric} />
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              Prometheus: <span className="text-primary">{selectedKey}</span>
            </p>
          </div>

          {/* Label selectors if metric has labels */}
          {hasLabels && info.labels.map(lbl => (
            <div key={lbl}>
              <label className="block font-mono text-[11px] text-foreground mb-1.5 capitalize">{lbl} Selector <span className="text-destructive">*</span></label>
              <SelectBox
                value={form[`hardware_label_${lbl}`] || LABEL_OPTIONS[lbl]?.[0] || ""}
                options={LABEL_OPTIONS[lbl] || []}
                onChange={v => setForm(f => ({ ...f, [`hardware_label_${lbl}`]: v }))}
              />
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">Label: <span className="text-primary">{lbl}</span></p>
            </div>
          ))}

          {/* Target Type */}
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Target Type <span className="text-destructive">*</span></label>
            <SelectBox value={form.targetType || "Host"} options={["Host", "Cluster Node"]} onChange={v => setForm(f => ({ ...f, targetType: v }))} />
          </div>

          {/* Host */}
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Host <span className="text-destructive">*</span></label>
            <SelectBox value={form.host || ""} options={["web-01.prod.local", "web-02.prod.local", "app-01.prod.local", "db-01.prod.local"]} onChange={v => setForm(f => ({ ...f, host: v }))} />
          </div>

          {/* Aggregation */}
          <div>
            <label className="block font-mono text-[11px] text-foreground mb-1.5">Aggregation <span className="text-destructive">*</span></label>
            <SelectBox value={form.aggregation || "Average (Avg)"} options={["Average (Avg)", "Maximum (Max)", "Minimum (Min)", "Last Value"]} onChange={v => setForm(f => ({ ...f, aggregation: v }))} />
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">How values are aggregated for evaluation.</p>
          </div>
        </div>

        {/* Info Panel */}
        <div className="col-span-1">
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4 h-full space-y-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">About {info.label}</p>
            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">{info.desc}</p>
            <div className="border-t border-primary/10 pt-3 space-y-2.5">
              <div>
                <p className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider mb-1">Prometheus Metric</p>
                <p className="font-mono text-[10px] text-muted-foreground break-all">{selectedKey}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider mb-1">Unit</p>
                <p className="font-mono text-[11px] text-muted-foreground">{info.unit}</p>
              </div>
              {hasLabels && (
                <div>
                  <p className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider mb-1">Labels</p>
                  <div className="flex flex-wrap gap-1">
                    {info.labels.map(l => (
                      <span key={l} className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 font-mono text-[10px] text-primary">{l}</span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider mb-1">Category</p>
                <span className={`inline-block rounded px-1.5 py-0.5 font-mono text-[10px] border ${catData.bg} ${catData.color}`}>
                  {category}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}

// import { useState, useEffect, useMemo, useCallback } from "react"
// import { Panel } from "@/components/kit"
// import { SelectBox } from "../wizardComponents"
// import {
//   Cpu,
//   HardDrive,
//   Fan,
//   Activity,
//   ShieldAlert,
//   Zap,
//   Info,
//   Sliders,
//   Server,
//   CheckCircle2,
//   AlertTriangle,
//   RotateCcw,
//   Search,
//   Filter,
//   Layers,
//   Settings,
//   HelpCircle,
//   Database,
//   Terminal,
//   Bookmark
// } from "lucide-react"
//
// // ============================================================================
// // 1. COMPREHENSIVE HARDWARE CATEGORIES, METRICS & METADATA DICTIONARY
// // ============================================================================
//
// const CATEGORIES = {
//   "CPU Temperature": {
//     description: "Thermal sensors monitoring CPU core dies, socket packages, and VRMs.",
//     icon: Cpu,
//     color: "text-orange-400",
//     bg: "bg-orange-400/10 border-orange-400/20",
//     metrics: {
//       "hardware_cpu_average_temperature_celsius": {
//         label: "CPU Average Temperature",
//         desc: "Average temperature across all available physical CPU cores and sockets.",
//         unit: "°C",
//         labels: [],
//         safeRange: [30, 75],
//         criticalThreshold: 90,
//         promqlTemplate: 'avg by (instance) (node_hwmon_temp_celsius{chip=~".*coretemp.*"})',
//         category: "CPU Temperature",
//       },
//       "hardware_cpu_max_temperature_celsius": {
//         label: "CPU Maximum Core Temperature",
//         desc: "Highest instantaneous temperature recorded among any single CPU core die.",
//         unit: "°C",
//         labels: [],
//         safeRange: [35, 82],
//         criticalThreshold: 95,
//         promqlTemplate: 'max by (instance) (node_hwmon_temp_celsius{chip=~".*coretemp.*"})',
//         category: "CPU Temperature",
//       },
//       "hardware_cpu_vrm_temperature_celsius": {
//         label: "CPU VRM Mosfet Temperature",
//         desc: "Voltage Regulator Module temperature supplying core power rails.",
//         unit: "°C",
//         labels: [],
//         safeRange: [40, 85],
//         criticalThreshold: 110,
//         promqlTemplate: 'node_hwmon_temp_celsius{sensor=~".*vrm.*|.*mos.*"}',
//         category: "CPU Temperature",
//       },
//       "hardware_cpu_thermal_throttle_count": {
//         label: "CPU Thermal Throttle Assertions",
//         desc: "Frequency of hardware PROCHOT# thermal throttle events per minute.",
//         unit: "events/m",
//         labels: [],
//         safeRange: [0, 0],
//         criticalThreshold: 1,
//         promqlTemplate: 'rate(node_cpu_package_throttles_total[5m]) * 60',
//         category: "CPU Temperature",
//       },
//     },
//   },
//
//   "Cooling": {
//     description: "Chassis fans, liquid cooling loops, PWM duty cycles, and pump flow rates.",
//     icon: Fan,
//     color: "text-blue-400",
//     bg: "bg-blue-400/10 border-blue-400/20",
//     metrics: {
//       "hardware_fan_speed_rpm": {
//         label: "Cooling Fan Tachometer Speed",
//         desc: "Rotational velocity of a system cooling fan in revolutions per minute.",
//         unit: "RPM",
//         labels: ["fan"],
//         safeRange: [800, 5000],
//         criticalThreshold: 300,
//         promqlTemplate: 'node_hwmon_fan_rpm',
//         category: "Cooling",
//       },
//       "hardware_fan_pwm_percentage": {
//         label: "Fan Duty Cycle (PWM)",
//         desc: "Pulse-width modulation percentage signal sent to chassis fan controllers.",
//         unit: "%",
//         labels: ["fan"],
//         safeRange: [20, 80],
//         criticalThreshold: 100,
//         promqlTemplate: '(node_hwmon_pwm / 255) * 100',
//         category: "Cooling",
//       },
//       "hardware_pump_flow_rate_lph": {
//         label: "Liquid Coolant Loop Flow Rate",
//         desc: "Volumetric fluid velocity across closed-loop cooling manifolds.",
//         unit: "L/h",
//         labels: ["pump"],
//         safeRange: [60, 250],
//         criticalThreshold: 25,
//         promqlTemplate: 'hardware_liquid_loop_flow_liters_per_hour',
//         category: "Cooling",
//       },
//     },
//   },
//
//   "Disk Hardware Health": {
//     description: "Storage media operating temperatures, S.M.A.R.T. endurance, and wearout counters.",
//     icon: HardDrive,
//     color: "text-yellow-400",
//     bg: "bg-yellow-400/10 border-yellow-400/20",
//     metrics: {
//       "hardware_disk_temperature_celsius": {
//         label: "Disk / NVMe Temperature",
//         desc: "Operating temperature of physical disk drives obtained from hardware monitoring data.",
//         unit: "°C",
//         labels: ["device"],
//         safeRange: [25, 55],
//         criticalThreshold: 75,
//         promqlTemplate: 'node_hwmon_temp_celsius{chip=~".*nvme.*|.*drivetemp.*"}',
//         category: "Disk Hardware Health",
//       },
//       "hardware_disk_power_on_hours": {
//         label: "Disk Cumulative Power-On Hours",
//         desc: "Total operational runtime hours recorded for hardware aging and maintenance scheduling.",
//         unit: "Hours",
//         labels: ["device"],
//         safeRange: [0, 40000],
//         criticalThreshold: 60000,
//         promqlTemplate: 'smartmon_power_on_hours_raw_value',
//         category: "Disk Hardware Health",
//       },
//       "hardware_disk_smart_status": {
//         label: "Disk S.M.A.R.T. Health Score",
//         desc: "Remaining SSD endurance percentage or composite predictive failure index.",
//         unit: "%",
//         labels: ["device"],
//         safeRange: [30, 100],
//         criticalThreshold: 10,
//         promqlTemplate: '100 - smartmon_percentage_used_raw_value',
//         category: "Disk Hardware Health",
//       },
//       "hardware_disk_uncorrectable_errors": {
//         label: "Uncorrectable Sector & Media Errors",
//         desc: "Count of unrecoverable read/write sector errors or NVMe integrity faults.",
//         unit: "errors",
//         labels: ["device"],
//         safeRange: [0, 0],
//         criticalThreshold: 1,
//         promqlTemplate: 'smartmon_media_errors_raw_value',
//         category: "Disk Hardware Health",
//       },
//     },
//   },
//
//   "Power & Voltage": {
//     description: "Regulated DC power rails (+12V, +5V) and instantaneous wall power draw.",
//     icon: Zap,
//     color: "text-emerald-400",
//     bg: "bg-emerald-400/10 border-emerald-400/20",
//     metrics: {
//       "hardware_voltage_rail_12v": {
//         label: "+12V Primary Power Rail Voltage",
//         desc: "Regulated +12V DC rail supplying CPU VRMs and PCIe GPU slots (ATX spec ±5%).",
//         unit: "V",
//         labels: [],
//         safeRange: [11.4, 12.6],
//         criticalThreshold: 11.1,
//         promqlTemplate: 'node_hwmon_in_volts{sensor="in0"}',
//         category: "Power & Voltage",
//       },
//       "hardware_voltage_rail_5v": {
//         label: "+5V Auxiliary Power Rail Voltage",
//         desc: "Regulated +5V DC rail supplying SATA logic and motherboard chipsets.",
//         unit: "V",
//         labels: [],
//         safeRange: [4.75, 5.25],
//         criticalThreshold: 4.6,
//         promqlTemplate: 'node_hwmon_in_volts{sensor="in1"}',
//         category: "Power & Voltage",
//       },
//       "hardware_power_draw_watts": {
//         label: "Total System Wall Power Draw",
//         desc: "Instantaneous active power consumption reported by IPMI/BMC power meters.",
//         unit: "W",
//         labels: [],
//         safeRange: [100, 1200],
//         criticalThreshold: 1800,
//         promqlTemplate: 'node_ipmi_power_watts',
//         category: "Power & Voltage",
//       },
//     },
//   },
//
//   "Memory & ECC": {
//     description: "RAM module temperatures and hardware single-bit/multi-bit ECC error rates.",
//     icon: Server,
//     color: "text-purple-400",
//     bg: "bg-purple-400/10 border-purple-400/20",
//     metrics: {
//       "hardware_memory_ecc_ce_rate": {
//         label: "Memory ECC Correctable Error Rate",
//         desc: "Single-bit DRAM errors corrected by hardware Error-Correcting Code per hour.",
//         unit: "err/hr",
//         labels: ["dimm"],
//         safeRange: [0, 10],
//         criticalThreshold: 100,
//         promqlTemplate: 'rate(node_edac_correctable_errors_total[1h]) * 3600',
//         category: "Memory & ECC",
//       },
//       "hardware_memory_ecc_ue_count": {
//         label: "Memory ECC Uncorrectable Errors",
//         desc: "Multi-bit uncorrectable DRAM errors causing Machine Check Exceptions (MCE).",
//         unit: "errors",
//         labels: ["dimm"],
//         safeRange: [0, 0],
//         criticalThreshold: 1,
//         promqlTemplate: 'increase(node_edac_uncorrectable_errors_total[5m])',
//         category: "Memory & ECC",
//       },
//       "hardware_memory_dimm_temperature_celsius": {
//         label: "DIMM Module Thermal Sensor",
//         desc: "On-DIMM thermal sensor temperature (TSOD) across memory channels.",
//         unit: "°C",
//         labels: ["dimm"],
//         safeRange: [30, 65],
//         criticalThreshold: 85,
//         promqlTemplate: 'node_hwmon_temp_celsius{chip=~".*jc42.*"}',
//         category: "Memory & ECC",
//       },
//     },
//   },
// }
//
// const LABEL_OPTIONS = {
//   fan:    ["Fan 1 (Front Intake)", "Fan 2 (Top Exhaust)", "Fan 3 (Rear Exhaust)", "CPU Cooler Fan", "All Fans"],
//   device: ["/dev/sda", "/dev/sdb", "/dev/nvme0n1", "/dev/nvme1n1", "All Devices"],
//   pump:   ["Loop 1 Pump", "Loop 2 Pump", "Main Manifold", "All Pumps"],
//   dimm:   ["DIMM_A1", "DIMM_A2", "DIMM_B1", "DIMM_B2", "All Channels"],
// }
//
// const TARGET_HOSTS = [
//   "web-01.prod.local",
//   "web-02.prod.local",
//   "app-cluster-node-01.local",
//   "app-cluster-node-02.local",
//   "db-primary-01.prod.local",
//   "db-replica-01.prod.local",
//   "storage-san-01.prod.local",
//   "cache-redis-01.prod.local",
// ]
//
// // ============================================================================
// // 2. MAIN COMPONENT DEFINITION: Step4Hardware
// // ============================================================================
//
// export default function Step4Hardware({ form, setForm }) {
//   // --------------------------------------------------------------------------
//   // STATE MANAGEMENT & LOCAL HOOKS
//   // --------------------------------------------------------------------------
//   const [category, setCategory] = useState(form.hardwareCategory || "CPU Temperature")
//   const [searchQuery, setSearchQuery] = useState("")
//   const [activeSubTab, setActiveSubTab] = useState("config") // "config" | "preview" | "promql" | "diagnostics"
//   const [hostFilterText, setHostFilterText] = useState("")
//   const [isSimulatingTest, setIsSimulatingTest] = useState(false)
//   const [simulationValue, setSimulationValue] = useState(72)
//   const [copyFeedback, setCopyFeedback] = useState(false)
//
//   // Retrieve category and metric definitions safely
//   const catData = CATEGORIES[category] || CATEGORIES["CPU Temperature"]
//   const metricKeys = Object.keys(catData.metrics)
//   const selectedKey = catData.metrics[form.hardwareMetric] ? form.hardwareMetric : metricKeys[0]
//   const info = catData.metrics[selectedKey] || catData.metrics[metricKeys[0]]
//   const hasLabels = info.labels && info.labels.length > 0
//
//   // --------------------------------------------------------------------------
//   // EVENT HANDLERS & FORM SYNCHRONIZATION
//   // --------------------------------------------------------------------------
//   const handleCategoryChange = useCallback((newCategory) => {
//     setCategory(newCategory)
//     const newCatData = CATEGORIES[newCategory] || CATEGORIES["CPU Temperature"]
//     const firstMetricKey = Object.keys(newCatData.metrics)[0]
//
//     setForm(f => ({
//       ...f,
//       hardwareCategory: newCategory,
//       hardwareMetric: firstMetricKey,
//       condMetric: firstMetricKey,
//     }))
//   }, [setForm])
//
//   const handleMetricChange = useCallback((newMetricKey) => {
//     setForm(f => ({
//       ...f,
//       hardwareMetric: newMetricKey,
//       condMetric: newMetricKey,
//     }))
//   }, [setForm])
//
//   const handleLabelChange = useCallback((lbl, val) => {
//     setForm(f => ({
//       ...f,
//       [`hardware_label_${lbl}`]: val,
//     }))
//   }, [setForm])
//
//   const handleTargetTypeChange = useCallback((val) => {
//     setForm(f => ({
//       ...f,
//       targetType: val,
//     }))
//   }, [setForm])
//
//   const handleHostChange = useCallback((val) => {
//     setForm(f => ({
//       ...f,
//       host: val,
//     }))
//   }, [setForm])
//
//   const handleAggregationChange = useCallback((val) => {
//     setForm(f => ({
//       ...f,
//       aggregation: val,
//     }))
//   }, [setForm])
//
//   // Filtered hosts based on search
//   const filteredHosts = useMemo(() => {
//     if (!hostFilterText) return TARGET_HOSTS
//     return TARGET_HOSTS.filter(h => h.toLowerCase().includes(hostFilterText.toLowerCase()))
//   }, [hostFilterText])
//
//   // Compiled PromQL preview generator
//   const compiledPromQLQuery = useMemo(() => {
//     let template = info.promqlTemplate || selectedKey
//     // If labels are present, attach label matchers
//     if (hasLabels) {
//       const matchers = info.labels.map(l => {
//         const val = form[`hardware_label_${l}`] || LABEL_OPTIONS[l]?.[0] || "All"
//         if (val.startsWith("All")) return null
//         return `${l}="${val}"`
//       }).filter(Boolean)
//
//       if (matchers.length > 0) {
//         template = template.replace(/\{([^}]*)\}/, (match, g1) => {
//           return g1 ? `{${g1}, ${matchers.join(", ")}}` : `{${matchers.join(", ")}}`
//         })
//       }
//     }
//     return template
//   }, [info, selectedKey, hasLabels, form])
//
//   // Simulation test evaluation
//   const simulationResult = useMemo(() => {
//     const thresh = info.criticalThreshold || 80
//     return simulationValue >= thresh
//   }, [simulationValue, info])
//
//   // Logging debug state to console as requested by legacy pattern
//   useEffect(() => {
//     console.log(
//       "STEP 4 - HARDWARE METRIC FORM DATA:\n",
//       JSON.stringify(form, null, 2)
//     )
//   }, [form])
//
//   // Clipboard copy handler
//   const handleCopyPromQL = () => {
//     if (typeof navigator !== "undefined" && navigator.clipboard) {
//       navigator.clipboard.writeText(compiledPromQLQuery)
//       setCopyFeedback(true)
//       setTimeout(() => setCopyFeedback(false), 2000)
//     }
//   }
//
//   // --------------------------------------------------------------------------
//   // RENDER INTERFACE
//   // --------------------------------------------------------------------------
//   return (
//     <Panel className="p-6 space-y-6">
//
//       {/* ------------------------------------------------------------------ */}
//       {/* HEADER SECTION WITH SUB-TABS NAVIGATION                            */}
//       {/* ------------------------------------------------------------------ */}
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
//         <div>
//           <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
//             4. Target & Metric
//           </p>
//           <p className="text-xs text-muted-foreground mt-0.5">
//             Select the hardware category, specific telemetry metric, target host scope, and aggregation rules.
//           </p>
//         </div>
//
//         {/* Sub-tab Switcher */}
//         <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border">
//           {[
//             { id: "config", label: "Configuration", icon: Sliders },
//             { id: "preview", label: "Metric Info", icon: Info },
//             { id: "promql", label: "PromQL Studio", icon: Terminal },
//             { id: "diagnostics", label: "Linter & Health", icon: ShieldAlert },
//           ].map(tab => {
//             const Icon = tab.icon
//             const isActive = activeSubTab === tab.id
//             return (
//               <button
//                 key={tab.id}
//                 type="button"
//                 onClick={() => setActiveSubTab(tab.id)}
//                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs transition-colors cursor-pointer ${
//                   isActive
//                     ? "bg-primary text-primary-foreground font-bold"
//                     : "text-muted-foreground hover:text-foreground hover:bg-secondary"
//                 }`}
//               >
//                 <Icon className="size-3.5" />
//                 <span>{tab.label}</span>
//               </button>
//             )
//           })}
//         </div>
//       </div>
//
//       {/* ------------------------------------------------------------------ */}
//       {/* TAB 1: MAIN CONFIGURATION BUILDER                                  */}
//       {/* ------------------------------------------------------------------ */}
//       {activeSubTab === "config" && (
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
//
//           {/* Left Column: Form Controls (Span 2) */}
//           <div className="lg:col-span-2 space-y-5">
//
//             {/* Hardware Category Selector */}
//             <div className="space-y-1.5">
//               <label className="block font-mono text-[11px] text-foreground">
//                 Hardware Category <span className="text-destructive">*</span>
//               </label>
//               <SelectBox
//                 value={category}
//                 options={Object.keys(CATEGORIES)}
//                 onChange={handleCategoryChange}
//               />
//               <p className="font-mono text-[10px] text-muted-foreground">
//                 {catData.description}
//               </p>
//             </div>
//
//             {/* Metric Selector */}
//             <div className="space-y-1.5">
//               <label className="block font-mono text-[11px] text-foreground">
//                 Metric <span className="text-destructive">*</span>
//               </label>
//               <SelectBox
//                 value={selectedKey}
//                 options={metricKeys}
//                 onChange={handleMetricChange}
//               />
//               <div className="flex items-center justify-between pt-1">
//                 <p className="font-mono text-[10px] text-muted-foreground">
//                   Prometheus Key: <span className="text-primary font-bold">{selectedKey}</span>
//                 </p>
//                 <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
//                   Unit: {info.unit}
//                 </span>
//               </div>
//             </div>
//
//             {/* Dynamic Label Selectors (if metric requires them) */}
//             {hasLabels && (
//               <div className="rounded-lg border border-border/80 bg-secondary/20 p-4 space-y-4">
//                 <div className="flex items-center gap-2">
//                   <Filter className="size-3.5 text-primary" />
//                   <span className="font-mono text-[11px] font-bold text-foreground uppercase tracking-wide">
//                     Hardware Sub-Selectors & Dimensional Filters
//                   </span>
//                 </div>
//
//                 {info.labels.map(lbl => {
//                   const optionsList = LABEL_OPTIONS[lbl] || ["All"]
//                   const currentVal = form[`hardware_label_${lbl}`] || optionsList[0] || ""
//                   return (
//                     <div key={lbl} className="space-y-1.5">
//                       <label className="block font-mono text-[11px] text-foreground capitalize">
//                         {lbl} Selector <span className="text-destructive">*</span>
//                       </label>
//                       <SelectBox
//                         value={currentVal}
//                         options={optionsList}
//                         onChange={v => handleLabelChange(lbl, v)}
//                       />
//                       <p className="font-mono text-[10px] text-muted-foreground">
//                         Filtering Prometheus timeseries label: <span className="text-primary">{lbl}</span>
//                       </p>
//                     </div>
//                   )
//                 })}
//               </div>
//             )}
//
//             {/* Target Scope Section */}
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
//
//               {/* Target Type */}
//               <div className="space-y-1.5">
//                 <label className="block font-mono text-[11px] text-foreground">
//                   Target Scope Type <span className="text-destructive">*</span>
//                 </label>
//                 <SelectBox
//                   value={form.targetType || "Host"}
//                   options={["Host", "Cluster Node", "Datacenter Rack", "All Nodes in Subsystem"]}
//                   onChange={handleTargetTypeChange}
//                 />
//                 <p className="font-mono text-[10px] text-muted-foreground">
//                   Determines evaluation scope topology.
//                 </p>
//               </div>
//
//               {/* Host Selector with Quick Filter */}
//               <div className="space-y-1.5">
//                 <div className="flex items-center justify-between">
//                   <label className="block font-mono text-[11px] text-foreground">
//                     Target Host <span className="text-destructive">*</span>
//                   </label>
//                   <input
//                     type="text"
//                     placeholder="Filter hosts..."
//                     value={hostFilterText}
//                     onChange={e => setHostFilterText(e.target.value)}
//                     className="w-28 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground focus:outline-none focus:border-primary"
//                   />
//                 </div>
//                 <SelectBox
//                   value={form.host || TARGET_HOSTS[0]}
//                   options={filteredHosts}
//                   onChange={handleHostChange}
//                 />
//                 <p className="font-mono text-[10px] text-muted-foreground">
//                   Monitored instance endpoint.
//                 </p>
//               </div>
//
//             </div>
//
//             {/* Aggregation Method */}
//             <div className="space-y-1.5 pt-2">
//               <label className="block font-mono text-[11px] text-foreground">
//                 Aggregation Function <span className="text-destructive">*</span>
//               </label>
//               <SelectBox
//                 value={form.aggregation || "Average (Avg)"}
//                 options={[
//                   "Average (Avg)",
//                   "Maximum (Max)",
//                   "Minimum (Min)",
//                   "Sum Total",
//                   "Rate of Change (Deriv)",
//                   "Last Reported Value"
//                 ]}
//                 onChange={handleAggregationChange}
//               />
//               <p className="font-mono text-[10px] text-muted-foreground">
//                 Mathematical reduction applied across multi-core or multi-device samples prior to condition evaluation.
//               </p>
//             </div>
//
//           </div>
//
//           {/* Right Column: Embedded Info Panel (Span 1) */}
//           <div className="lg:col-span-1">
//             <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 h-full flex flex-col justify-between space-y-4">
//
//               <div className="space-y-3">
//                 <div className="flex items-center gap-2 border-b border-primary/10 pb-2">
//                   <CatDataIcon category={category} />
//                   <p className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
//                     {info.label}
//                   </p>
//                 </div>
//
//                 <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
//                   {info.desc}
//                 </p>
//
//                 <div className="space-y-2.5 pt-2">
//                   <div className="rounded bg-card/60 border border-border/60 p-2.5 space-y-1">
//                     <p className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider">
//                       Safe Operating Threshold
//                     </p>
//                     <p className="font-mono text-xs text-foreground font-semibold">
//                       {info.safeRange ? `${info.safeRange[0]}–${info.safeRange[1]} ${info.unit}` : "N/A"}
//                     </p>
//                   </div>
//
//                   <div className="rounded bg-destructive/10 border border-destructive/20 p-2.5 space-y-1">
//                     <p className="font-mono text-[10px] text-destructive font-bold uppercase tracking-wider">
//                       Critical Warning Threshold
//                     </p>
//                     <p className="font-mono text-xs text-foreground font-semibold">
//                       Exceeding {info.criticalThreshold} {info.unit}
//                     </p>
//                   </div>
//                 </div>
//               </div>
//
//               <div className="border-t border-primary/10 pt-3 space-y-2 font-mono text-[10px]">
//                 <div className="flex items-center justify-between">
//                   <span className="text-muted-foreground">Category:</span>
//                   <span className={`px-1.5 py-0.5 rounded border ${catData.bg} ${catData.color}`}>
//                     {category}
//                   </span>
//                 </div>
//                 <div className="flex items-center justify-between">
//                   <span className="text-muted-foreground">Unit of Measure:</span>
//                   <span className="text-foreground font-bold">{info.unit}</span>
//                 </div>
//                 <div className="flex items-center justify-between">
//                   <span className="text-muted-foreground">Target Host:</span>
//                   <span className="text-primary truncate max-w-[140px]" title={form.host || TARGET_HOSTS[0]}>
//                     {form.host || TARGET_HOSTS[0]}
//                   </span>
//                 </div>
//               </div>
//
//             </div>
//           </div>
//
//         </div>
//       )}
//
//       {/* ------------------------------------------------------------------ */}
//       {/* TAB 2: METRIC INFO & METADATA DEEP DIVE                            */}
//       {/* ------------------------------------------------------------------ */}
//       {activeSubTab === "preview" && (
//         <div className="space-y-6 animate-in fade-in duration-200">
//           <div className="rounded-lg border border-border bg-card p-6 space-y-6">
//             <div className="flex items-center gap-3 border-b border-border pb-4">
//               <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
//                 <Database className="size-5" />
//               </div>
//               <div>
//                 <h4 className="font-mono text-sm font-bold text-foreground">
//                   {info.label} ({selectedKey})
//                 </h4>
//                 <p className="text-xs text-muted-foreground">
//                   Detailed hardware telemetry specification and sensor instrumentation guide.
//                 </p>
//               </div>
//             </div>
//
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//               <div className="rounded-md border border-border bg-background p-4 space-y-1.5">
//                 <span className="font-mono text-[10px] uppercase text-muted-foreground">Subsystem Domain</span>
//                 <p className="font-mono text-xs font-bold text-foreground">{category}</p>
//               </div>
//               <div className="rounded-md border border-border bg-background p-4 space-y-1.5">
//                 <span className="font-mono text-[10px] uppercase text-muted-foreground">Standard Measurement Unit</span>
//                 <p className="font-mono text-xs font-bold text-primary">{info.unit}</p>
//               </div>
//               <div className="rounded-md border border-border bg-background p-4 space-y-1.5">
//                 <span className="font-mono text-[10px] uppercase text-muted-foreground">Collector Exporter Source</span>
//                 <p className="font-mono text-xs font-bold text-foreground">node_exporter / IPMI BMC</p>
//               </div>
//             </div>
//
//             <div className="space-y-2">
//               <h5 className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
//                 Telemetry Description & Operational Behavior
//               </h5>
//               <p className="text-xs text-muted-foreground leading-relaxed">
//                 {info.desc} Monitoring this metric enables proactive capacity planning and helps prevent thermal throttling, sudden disk controller brownouts, or unexpected multi-bit memory parity faults across enterprise production clusters.
//               </p>
//             </div>
//
//             <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
//               <h5 className="font-mono text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
//                 <Info className="size-3.5" />
//                 Recommended SRE Alert Tuning Best Practice
//               </h5>
//               <p className="text-xs text-muted-foreground leading-relaxed">
//                 For optimal signal-to-noise ratio in high-density rack environments, pair this metric with a sustained evaluation window of at least 2 minutes. Avoid setting static thresholds during peak computational load test windows without accounting for ambient datacenter HVAC fluctuations.
//               </p>
//             </div>
//           </div>
//         </div>
//       )}
//
//       {/* ------------------------------------------------------------------ */}
//       {/* TAB 3: PROMQL STUDIO & EXPRESSION COMPILER                         */}
//       {/* ------------------------------------------------------------------ */}
//       {activeSubTab === "promql" && (
//         <div className="space-y-6 animate-in fade-in duration-200">
//           <div className="rounded-lg border border-border bg-card p-6 space-y-5">
//             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
//               <div>
//                 <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
//                   <Terminal className="size-4 text-primary" />
//                   Compiled Prometheus Query Expression (PromQL)
//                 </h4>
//                 <p className="text-xs text-muted-foreground mt-0.5">
//                   Live generated expression reflecting selected metric, sub-selectors, and host filters.
//                 </p>
//               </div>
//
//               <button
//                 type="button"
//                 onClick={handleCopyPromQL}
//                 className="flex items-center gap-1.5 rounded border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-xs font-bold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
//               >
//                 {copyFeedback ? "Copied to Clipboard!" : "Copy PromQL Expression"}
//               </button>
//             </div>
//
//             <div className="rounded-md border border-border bg-background p-4 font-mono text-xs text-foreground overflow-x-auto">
//               <code>{compiledPromQLQuery}</code>
//             </div>
//
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
//               <div className="rounded-md border border-border bg-background p-4 space-y-2">
//                 <span className="font-mono text-[10px] uppercase text-muted-foreground font-bold">Target Instance Scope</span>
//                 <p className="font-mono text-xs text-primary font-semibold">{form.host || TARGET_HOSTS[0]}</p>
//                 <p className="text-[11px] text-muted-foreground">Scraped via Prometheus node_exporter discovery job.</p>
//               </div>
//
//               <div className="rounded-md border border-border bg-background p-4 space-y-2">
//                 <span className="font-mono text-[10px] uppercase text-muted-foreground font-bold">Reduction Aggregation</span>
//                 <p className="font-mono text-xs text-primary font-semibold">{form.aggregation || "Average (Avg)"}</p>
//                 <p className="text-[11px] text-muted-foreground">Applies vectorized mathematical reduction before rule evaluation.</p>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//
//       {/* ------------------------------------------------------------------ */}
//       {/* TAB 4: DIAGNOSTICS & THRESHOLD HEALTH CHECKER                      */}
//       {/* ------------------------------------------------------------------ */}
//       {activeSubTab === "diagnostics" && (
//         <div className="space-y-6 animate-in fade-in duration-200">
//           <div className="rounded-lg border border-border bg-card p-6 space-y-5">
//             <div className="border-b border-border pb-4">
//               <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
//                 Interactive Telemetry Sanity Checker
//               </h4>
//               <p className="text-xs text-muted-foreground mt-0.5">
//                 Simulate incoming sensor values to test whether the selected metric and configuration behave as expected.
//               </p>
//             </div>
//
//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
//               <div className="space-y-4">
//                 <div className="flex items-center justify-between">
//                   <span className="font-mono text-xs font-bold text-foreground">
//                     Simulate Sensor Reading ({info.label}):
//                   </span>
//                   <span className="font-mono text-sm font-bold text-primary">
//                     {simulationValue} {info.unit}
//                   </span>
//                 </div>
//
//                 <input
//                   type="range"
//                   min="0"
//                   max={info.unit === "°C" ? 120 : info.unit === "%" ? 100 : 10000}
//                   step="1"
//                   value={simulationValue}
//                   onChange={e => setSimulationValue(Number(e.target.value))}
//                   className="w-full accent-primary cursor-pointer"
//                 />
//
//                 <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
//                   <span>Safe Max: {info.safeRange ? info.safeRange[1] : 50} {info.unit}</span>
//                   <span className="text-destructive font-bold">Critical Threshold: {info.criticalThreshold} {info.unit}</span>
//                 </div>
//               </div>
//
//               {/* Simulation Result Status Card */}
//               <div className={`rounded-lg border p-4 flex items-center gap-3 ${
//                 simulationResult
//                   ? "border-destructive/40 bg-destructive/10 text-destructive"
//                   : "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
//               }`}>
//                 {simulationResult ? (
//                   <AlertTriangle className="size-6 shrink-0" />
//                 ) : (
//                   <CheckCircle2 className="size-6 shrink-0" />
//                 )}
//                 <div>
//                   <p className="font-mono text-xs font-bold uppercase tracking-wide">
//                     {simulationResult ? "Critical Warning Triggered" : "Normal Operating State"}
//                   </p>
//                   <p className="text-[11px] opacity-90 mt-0.5">
//                     {simulationResult
//                       ? `Simulated value ${simulationValue} ${info.unit} exceeds critical limit of ${info.criticalThreshold} ${info.unit}.`
//                       : `Simulated value ${simulationValue} ${info.unit} is within normal operating parameters.`
//                     }
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//
//       {/* ------------------------------------------------------------------ */}
//       {/* PERSISTENT FOOTER SUMMARY BAR                                      */}
//       {/* ------------------------------------------------------------------ */}
//       <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
//         <div className="flex items-center justify-between">
//           <p className="font-mono text-[10px] uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
//             <Info className="size-3.5" />
//             Step 4 Selection Summary
//           </p>
//           <span className="font-mono text-[10px] text-muted-foreground">
//             Target Host: <span className="text-foreground font-semibold">{form.host || TARGET_HOSTS[0]}</span>
//           </span>
//         </div>
//
//         <p className="font-mono text-xs text-foreground">
//           Category: <span className="text-primary font-bold">{category}</span> • Metric: <span className="text-primary font-bold">{info.label}</span> • Aggregation: <span className="text-foreground font-semibold">{form.aggregation || "Average (Avg)"}</span>
//         </p>
//       </div>
//
//     </Panel>
//   )
// }
//
// // ============================================================================
// // 3. HELPER ICON RENDERER COMPONENT
// // ============================================================================
// function CatDataIcon({ category }) {
//   const cat = CATEGORIES[category] || CATEGORIES["CPU Temperature"]
//   const IconComponent = cat.icon || Cpu
//   return <IconComponent className={`size-4 ${cat.color}`} />
// }
