import { useEffect, useState, useMemo, useCallback } from "react"
import {
  Plus,
  Trash2,
  Sliders,
  ShieldAlert,
  Cpu,
  HardDrive,
  Fan,
  Activity,
  Code,
  Info,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Layers,
  Zap,
  Thermometer,
  Server,
  Gauge,
  FileCode2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  CopyPlus,
  Wrench,
  BookOpen,
  Terminal,
} from "lucide-react"
import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"

// ============================================================================
// 1. EXTENSIVE HARDWARE TELEMETRY ONTOLOGY & SENSOR METADATA
// ============================================================================

const ALL_METRICS = {
  // --- CPU TEMPERATURE & THERMAL ---
  hardware_cpu_average_temperature_celsius: {
    label: "CPU Average Package Temperature",
    shortLabel: "CPU Avg Temp",
    unit: "°C",
    category: "CPU Temperature",
    icon: Cpu,
    description: "Weighted mean temperature across all active CPU packages and die sensors.",
    promqlTemplate: 'avg by (instance, socket) (node_hwmon_temp_celsius{chip=~".*coretemp.*|.*k10temp.*"})',
    min: 0,
    max: 125,
    step: 0.5,
    defaultThreshold: 82,
    safeRange: [30, 75],
    criticalThreshold: 95,
    severityHint: "High sustained package temps accelerate silicon electromigration.",
    remediationHint: "Verify chassis airflow, inspect thermal interface material, and check CPU governor.",
  },
  hardware_cpu_max_temperature_celsius: {
    label: "CPU Maximum Core Temperature",
    shortLabel: "CPU Max Core",
    unit: "°C",
    category: "CPU Temperature",
    icon: Thermometer,
    description: "Peak instantaneous temperature recorded on any individual physical core.",
    promqlTemplate: 'max by (instance, socket) (node_hwmon_temp_celsius{chip=~".*coretemp.*|.*k10temp.*"})',
    min: 0,
    max: 130,
    step: 0.5,
    defaultThreshold: 90,
    safeRange: [35, 85],
    criticalThreshold: 100,
    severityHint: "Single-core hotspots indicate uneven heatsink mounting pressure or single-thread boost spikes.",
    remediationHint: "Check cooler mounting torque and inspect per-core workload affinity.",
  },
  hardware_cpu_thermal_throttle_count: {
    label: "CPU Thermal Throttle Events",
    shortLabel: "Thermal Throttles",
    unit: "events/m",
    category: "CPU Temperature",
    icon: Activity,
    description: "Rate of hardware PROCHOT# thermal throttling assertions per minute.",
    promqlTemplate: 'rate(node_cpu_package_throttles_total[5m]) * 60',
    min: 0,
    max: 5000,
    step: 1,
    defaultThreshold: 1,
    safeRange: [0, 0],
    criticalThreshold: 10,
    severityHint: "Any non-zero thermal throttling directly degrades compute latency and SLA compliance.",
    remediationHint: "Reduce ambient intake temperature or cap turbo boost power limits (PL1/PL2).",
  },
  hardware_cpu_vrm_temperature_celsius: {
    label: "CPU VRM Mosfet Temperature",
    shortLabel: "VRM Temp",
    unit: "°C",
    category: "CPU Temperature",
    icon: Zap,
    description: "Voltage Regulator Module power stage temperature supplying CPU Vcore.",
    promqlTemplate: 'node_hwmon_temp_celsius{sensor=~".*vrm.*|.*mos.*"}',
    min: 0,
    max: 150,
    step: 1,
    defaultThreshold: 95,
    safeRange: [40, 85],
    criticalThreshold: 115,
    severityHint: "VRM overheating causes abrupt voltage droop and hard system resets under AVX loads.",
    remediationHint: "Ensure direct airflow over motherboard VRM heatsinks, especially with liquid AIO coolers.",
  },

  // --- COOLING & AIRFLOW ---
  hardware_fan_speed_rpm: {
    label: "Chassis & CPU Fan Speed",
    shortLabel: "Fan RPM",
    unit: "RPM",
    category: "Cooling",
    icon: Fan,
    description: "Tachometer rotational speed of primary cooling fans.",
    promqlTemplate: 'node_hwmon_fan_rpm',
    min: 0,
    max: 18000,
    step: 50,
    defaultThreshold: 600,
    safeRange: [800, 4500],
    criticalThreshold: 200,
    severityHint: "Low or zero RPM indicates bearing seizure, disconnected PWM header, or stalled rotor.",
    remediationHint: "Inspect fan blades for obstructions and verify PWM fan curve minimum duty floor.",
  },
  hardware_fan_pwm_percentage: {
    label: "Cooling Fan Duty Cycle (PWM)",
    shortLabel: "Fan Duty %",
    unit: "%",
    category: "Cooling",
    icon: Gauge,
    description: "Pulse-width modulation control signal percentage sent to fan controllers.",
    promqlTemplate: '(node_hwmon_pwm / 255) * 100',
    min: 0,
    max: 100,
    step: 1,
    defaultThreshold: 95,
    safeRange: [20, 75],
    criticalThreshold: 100,
    severityHint: "Sustained 100% duty cycle means cooling headroom is completely exhausted.",
    remediationHint: "Clean dust filters, check ambient rack cold-aisle temperature, or upgrade fan static pressure.",
  },
  hardware_pump_flow_rate_lph: {
    label: "Liquid Coolant Loop Flow Rate",
    shortLabel: "Coolant Flow",
    unit: "L/h",
    category: "Cooling",
    icon: Activity,
    description: "Volumetric fluid velocity across closed-loop or rack manifold liquid cooling.",
    promqlTemplate: 'hardware_liquid_loop_flow_liters_per_hour',
    min: 0,
    max: 600,
    step: 5,
    defaultThreshold: 40,
    safeRange: [60, 240],
    criticalThreshold: 20,
    severityHint: "Low flow rate signals pump impeller failure, airlock bubbles, or micro-channel clogging.",
    remediationHint: "Bleed air from radiator loop and check pump tachometer telemetry.",
  },
  hardware_coolant_temperature_celsius: {
    label: "Liquid Coolant Outlet Temperature",
    shortLabel: "Coolant Temp",
    unit: "°C",
    category: "Cooling",
    icon: Thermometer,
    description: "Fluid temperature exiting the cold plate heat exchanger.",
    promqlTemplate: 'hardware_liquid_coolant_temp_celsius',
    min: 0,
    max: 80,
    step: 0.5,
    defaultThreshold: 45,
    safeRange: [20, 38],
    criticalThreshold: 55,
    severityHint: "High coolant temps risk tubing deformation and pump seal degradation.",
    remediationHint: "Increase radiator fan speed or verify facility chilled-water heat exchanger.",
  },

  // --- DISK & STORAGE HARDWARE HEALTH ---
  hardware_disk_temperature_celsius: {
    label: "NVMe / SATA Drive Temperature",
    shortLabel: "Disk Temp",
    unit: "°C",
    category: "Disk Hardware Health",
    icon: HardDrive,
    description: "Composite controller and NAND flash operating temperature.",
    promqlTemplate: 'node_hwmon_temp_celsius{chip=~".*nvme.*|.*drivetemp.*"}',
    min: 0,
    max: 105,
    step: 1,
    defaultThreshold: 65,
    safeRange: [25, 55],
    criticalThreshold: 75,
    severityHint: "Elevated NAND temperatures accelerate charge leakage and trigger controller write throttling.",
    remediationHint: "Install M.2 thermal pads/heatsinks and verify drive bay airflow.",
  },
  hardware_disk_power_on_hours: {
    label: "Disk Cumulative Power-On Hours",
    shortLabel: "Power-On Hours",
    unit: "Hours",
    category: "Disk Hardware Health",
    icon: HardDrive,
    description: "Total operational runtime hours recorded in S.M.A.R.T. attribute 0x09.",
    promqlTemplate: 'smartmon_power_on_hours_raw_value',
    min: 0,
    max: 250000,
    step: 100,
    defaultThreshold: 43800,
    safeRange: [0, 35000],
    criticalThreshold: 60000,
    severityHint: "Drives exceeding 5 years (43,800h) enter elevated mechanical and wear-out failure curves.",
    remediationHint: "Schedule proactive RAID/ZFS pool scrubbing and plan rolling drive replacements.",
  },
  hardware_disk_smart_status: {
    label: "Disk S.M.A.R.T. Wearout / Health Index",
    shortLabel: "SMART Health",
    unit: "%",
    category: "Disk Hardware Health",
    icon: ShieldAlert,
    description: "Remaining SSD endurance percentage or composite S.M.A.R.T. health score.",
    promqlTemplate: '100 - smartmon_percentage_used_raw_value',
    min: 0,
    max: 100,
    step: 1,
    defaultThreshold: 20,
    safeRange: [30, 100],
    criticalThreshold: 10,
    severityHint: "Approaching 0% remaining endurance risks sudden transition to read-only lock mode.",
    remediationHint: "Cordon node workloads, drain persistent volumes, and replace SSD immediately.",
  },
  hardware_disk_uncorrectable_errors: {
    label: "Uncorrectable Media & ECC Errors",
    shortLabel: "Media Errors",
    unit: "errors",
    category: "Disk Hardware Health",
    icon: AlertOctagon,
    description: "Count of unrecoverable sector read errors or NVMe media integrity errors.",
    promqlTemplate: 'smartmon_media_errors_raw_value',
    min: 0,
    max: 10000,
    step: 1,
    defaultThreshold: 1,
    safeRange: [0, 0],
    criticalThreshold: 5,
    severityHint: "Uncorrectable media errors indicate imminent platter degradation or bad NAND blocks.",
    remediationHint: "Verify RAID parity redundancy and initiate immediate disk replacement.",
  },

  // --- POWER & VOLTAGE RAILS ---
  hardware_voltage_rail_12v: {
    label: "+12V Primary Power Rail Voltage",
    shortLabel: "+12V Rail",
    unit: "V",
    category: "Power & Voltage",
    icon: Zap,
    description: "Regulated +12V DC rail supplying CPU VRMs, GPUs, and drive motors (ATX spec ±5%).",
    promqlTemplate: 'node_hwmon_in_volts{sensor="in0"}',
    min: 0,
    max: 16,
    step: 0.05,
    defaultThreshold: 11.4,
    safeRange: [11.4, 12.6],
    criticalThreshold: 11.1,
    severityHint: "Dropping below 11.40V violates ATX 3.0 tolerance and causes PCIe/GPU bus instability.",
    remediationHint: "Inspect PSU load balance, modular cable seating, and upstream PDU phase voltage.",
  },
  hardware_voltage_rail_5v: {
    label: "+5V Auxiliary Power Rail Voltage",
    shortLabel: "+5V Rail",
    unit: "V",
    category: "Power & Voltage",
    icon: Zap,
    description: "Regulated +5V DC rail supplying SATA logic, USB controllers, and onboard sensors.",
    promqlTemplate: 'node_hwmon_in_volts{sensor="in1"}',
    min: 0,
    max: 7,
    step: 0.05,
    defaultThreshold: 4.75,
    safeRange: [4.75, 5.25],
    criticalThreshold: 4.6,
    severityHint: "Out-of-spec +5V rail leads to USB disconnects and SATA controller dropouts.",
    remediationHint: "Test PSU DC-to-DC minor rail regulation or swap redundant PSU module.",
  },
  hardware_power_draw_watts: {
    label: "Total System Wall Power Draw",
    shortLabel: "Power Draw",
    unit: "W",
    category: "Power & Voltage",
    icon: Gauge,
    description: "Real-time AC/DC active power consumption reported by IPMI/BMC power meter.",
    promqlTemplate: 'node_ipmi_power_watts',
    min: 0,
    max: 5000,
    step: 10,
    defaultThreshold: 1400,
    safeRange: [100, 1200],
    criticalThreshold: 1800,
    severityHint: "Exceeding rack breaker or PSU efficiency curve risks tripping circuit breakers.",
    remediationHint: "Apply RAPL package power caps or rebalance high-TDP compute pods across racks.",
  },

  // --- MEMORY & ECC INTEGRITY ---
  hardware_memory_ecc_ce_rate: {
    label: "Memory ECC Correctable Error Rate",
    shortLabel: "ECC CE Rate",
    unit: "err/hr",
    category: "Memory & ECC",
    icon: Server,
    description: "Single-bit DRAM errors corrected by hardware Error-Correcting Code per hour.",
    promqlTemplate: 'rate(node_edac_correctable_errors_total[1h]) * 3600',
    min: 0,
    max: 10000,
    step: 1,
    defaultThreshold: 50,
    safeRange: [0, 10],
    criticalThreshold: 500,
    severityHint: "Rising correctable error rates strongly predict an imminent uncorrectable multi-bit fault.",
    remediationHint: "Identify failing DIMM slot via EDAC / IPMI SEL logs and schedule maintenance swap.",
  },
  hardware_memory_ecc_ue_count: {
    label: "Memory ECC Uncorrectable Errors",
    shortLabel: "ECC UE Count",
    unit: "errors",
    category: "Memory & ECC",
    icon: AlertOctagon,
    description: "Multi-bit uncorrectable DRAM errors causing Machine Check Exceptions (MCE).",
    promqlTemplate: 'increase(node_edac_uncorrectable_errors_total[5m])',
    min: 0,
    max: 100,
    step: 1,
    defaultThreshold: 1,
    safeRange: [0, 0],
    criticalThreshold: 1,
    severityHint: "Uncorrectable ECC errors cause immediate kernel panic or silent data corruption.",
    remediationHint: "Immediately drain node and replace defective DIMM module.",
  },
  hardware_memory_dimm_temperature_celsius: {
    label: "DIMM / PMEM Module Temperature",
    shortLabel: "DIMM Temp",
    unit: "°C",
    category: "Memory & ECC",
    icon: Thermometer,
    description: "On-DIMM thermal sensor temperature (TSOD) across populated memory channels.",
    promqlTemplate: 'node_hwmon_temp_celsius{chip=~".*jc42.*"}',
    min: 0,
    max: 110,
    step: 1,
    defaultThreshold: 75,
    safeRange: [30, 65],
    criticalThreshold: 85,
    severityHint: "Above 85°C, DDR4/DDR5 doubles refresh rate (2x REFRESH), cutting memory bandwidth.",
    remediationHint: "Increase chassis mid-plane fan speed to direct airflow across DIMM banks.",
  },

  // --- GPU & ACCELERATORS ---
  hardware_gpu_core_temperature_celsius: {
    label: "GPU Die Core Temperature",
    shortLabel: "GPU Temp",
    unit: "°C",
    category: "GPU & Accelerators",
    icon: Cpu,
    description: "Primary GPU ASIC junction temperature reported via NVML/ROCm.",
    promqlTemplate: 'DCGM_FI_DEV_GPU_TEMP',
    min: 0,
    max: 115,
    step: 1,
    defaultThreshold: 83,
    safeRange: [30, 78],
    criticalThreshold: 92,
    severityHint: "GPU Boost clocks drop aggressively above 83°C, slowing ML training throughput.",
    remediationHint: "Verify GPU blower clearance and check PCIe slot airflow shrouds.",
  },
  hardware_gpu_memory_temperature_celsius: {
    label: "GPU HBM / VRAM Junction Temperature",
    shortLabel: "VRAM Temp",
    unit: "°C",
    category: "GPU & Accelerators",
    icon: Thermometer,
    description: "High-Bandwidth Memory (HBM2e/HBM3/GDDR6X) stack junction temperature.",
    promqlTemplate: 'DCGM_FI_DEV_MEMORY_TEMP',
    min: 0,
    max: 120,
    step: 1,
    defaultThreshold: 92,
    safeRange: [35, 85],
    criticalThreshold: 105,
    severityHint: "Excessive HBM temperature causes memory ECC page retirement and XID errors.",
    remediationHint: "Reduce GPU power limit via nvidia-smi or improve server front-to-rear static pressure.",
  },
  hardware_gpu_xid_errors: {
    label: "GPU Critical XID / Fault Events",
    shortLabel: "GPU XID Errors",
    unit: "events",
    category: "GPU & Accelerators",
    icon: ShieldAlert,
    description: "Count of hardware/driver XID fault interrupts on compute accelerators.",
    promqlTemplate: 'increase(DCGM_FI_DEV_XID_ERRORS[5m])',
    min: 0,
    max: 100,
    step: 1,
    defaultThreshold: 1,
    safeRange: [0, 0],
    criticalThreshold: 1,
    severityHint: "XID errors (e.g., 48, 79, 94) indicate bus fall-off, double-bit ECC, or NVLink faults.",
    remediationHint: "Inspect dmesg XID code, reset GPU via nvidia-smi -r, or RMA board.",
  },
}

// ============================================================================
// 2. CATEGORY MAPPINGS, OPERATORS & DEFAULTS
// ============================================================================

const CATEGORY_METRICS = {
  "CPU Temperature": [
    "hardware_cpu_average_temperature_celsius",
    "hardware_cpu_max_temperature_celsius",
    "hardware_cpu_thermal_throttle_count",
    "hardware_cpu_vrm_temperature_celsius",
  ],
  "Cooling": [
    "hardware_fan_speed_rpm",
    "hardware_fan_pwm_percentage",
    "hardware_pump_flow_rate_lph",
    "hardware_coolant_temperature_celsius",
  ],
  "Disk Hardware Health": [
    "hardware_disk_temperature_celsius",
    "hardware_disk_power_on_hours",
    "hardware_disk_smart_status",
    "hardware_disk_uncorrectable_errors",
  ],
  "Power & Voltage": [
    "hardware_voltage_rail_12v",
    "hardware_voltage_rail_5v",
    "hardware_power_draw_watts",
  ],
  "Memory & ECC": [
    "hardware_memory_ecc_ce_rate",
    "hardware_memory_ecc_ue_count",
    "hardware_memory_dimm_temperature_celsius",
  ],
  "GPU & Accelerators": [
    "hardware_gpu_core_temperature_celsius",
    "hardware_gpu_memory_temperature_celsius",
    "hardware_gpu_xid_errors",
  ],
}

const ALL_METRIC_KEYS = Object.keys(ALL_METRICS)

const METRIC_OPERATORS = {
  hardware_cpu_average_temperature_celsius: ["Greater Than (>)", "Greater or Equal (>=)", "Less Than (<)", "Less or Equal (<=)", "Equals (=)"],
  hardware_cpu_max_temperature_celsius: ["Greater Than (>)", "Greater or Equal (>=)", "Less Than (<)", "Equals (=)"],
  hardware_cpu_thermal_throttle_count: ["Greater Than (>)", "Greater or Equal (>=)", "Equals (=)"],
  hardware_cpu_vrm_temperature_celsius: ["Greater Than (>)", "Greater or Equal (>=)", "Less Than (<)"],
  hardware_fan_speed_rpm: ["Less Than (<)", "Less or Equal (<=)", "Greater Than (>)", "Equals (=)"],
  hardware_fan_pwm_percentage: ["Greater Than (>)", "Greater or Equal (>=)", "Less Than (<)"],
  hardware_pump_flow_rate_lph: ["Less Than (<)", "Less or Equal (<=)", "Equals (=)"],
  hardware_coolant_temperature_celsius: ["Greater Than (>)", "Greater or Equal (>=)", "Less Than (<)"],
  hardware_disk_temperature_celsius: ["Greater Than (>)", "Greater or Equal (>=)", "Less Than (<)"],
  hardware_disk_power_on_hours: ["Greater Than (>)", "Greater or Equal (>=)", "Equals (=)"],
  hardware_disk_smart_status: ["Less Than (<)", "Less or Equal (<=)", "Equals (=)"],
  hardware_disk_uncorrectable_errors: ["Greater Than (>)", "Greater or Equal (>=)", "Equals (=)"],
  hardware_voltage_rail_12v: ["Less Than (<)", "Greater Than (>)", "Equals (=)"],
  hardware_voltage_rail_5v: ["Less Than (<)", "Greater Than (>)", "Equals (=)"],
  hardware_power_draw_watts: ["Greater Than (>)", "Greater or Equal (>=)", "Less Than (<)"],
  hardware_memory_ecc_ce_rate: ["Greater Than (>)", "Greater or Equal (>=)"],
  hardware_memory_ecc_ue_count: ["Greater Than (>)", "Greater or Equal (>=)", "Equals (=)"],
  hardware_memory_dimm_temperature_celsius: ["Greater Than (>)", "Greater or Equal (>=)"],
  hardware_gpu_core_temperature_celsius: ["Greater Than (>)", "Greater or Equal (>=)", "Less Than (<)"],
  hardware_gpu_memory_temperature_celsius: ["Greater Than (>)", "Greater or Equal (>=)", "Less Than (<)"],
  hardware_gpu_xid_errors: ["Greater Than (>)", "Greater or Equal (>=)", "Equals (=)"],
}

const DEFAULT_OPERATORS = Object.keys(ALL_METRICS).reduce((acc, key) => {
  acc[key] = METRIC_OPERATORS[key]?.[0] || "Greater Than (>)"
  return acc
}, {})

const OPERATOR_SYMBOLS = {
  "Greater Than (>)": ">",
  "Greater or Equal (>=)": ">=",
  "Less Than (<)": "<",
  "Less or Equal (<=)": "<=",
  "Equals (=)": "==",
}

const DURATION_TO_SECONDS = {
  Seconds: 1,
  Minutes: 60,
  Hours: 3600,
}

const INTERVAL_TO_SECONDS = {
  "Every 10 seconds": 10,
  "Every 15 seconds": 15,
  "Every 30 seconds": 30,
  "Every 1 minute": 60,
  "Every 5 minutes": 300,
}

// ============================================================================
// 3. CURATED ENTERPRISE HARDWARE RULE PRESETS
// ============================================================================

const PRESET_TEMPLATES = [
  {
    id: "cpu-critical-thermal",
    name: "Critical CPU Package Overheat + Throttling",
    severity: "critical",
    description: "Fires when average CPU temperature exceeds 88°C AND thermal throttling occurs simultaneously.",
    category: "CPU Temperature",
    logicalOp: "AND",
    conditions: [
      {
        id: 1001,
        metric: "hardware_cpu_average_temperature_celsius",
        operator: "Greater Than (>)",
        threshold: "88",
        enabled: true,
        note: "Sustained thermal envelope breach",
      },
      {
        id: 1002,
        metric: "hardware_cpu_thermal_throttle_count",
        operator: "Greater or Equal (>=)",
        threshold: "1",
        enabled: true,
        note: "Confirm PROCHOT# assertion",
      },
    ],
    duration: "2",
    durationUnit: "Minutes",
    interval: "Every 15 seconds",
    occurrences: "6",
    outOf: "8",
  },
  {
    id: "cooling-fan-stall",
    name: "Primary Cooling Fan Stall / Rotor Failure",
    severity: "critical",
    description: "Immediate detection when chassis fan drops below 300 RPM while PWM duty cycle is above 50%.",
    category: "Cooling",
    logicalOp: "AND",
    conditions: [
      {
        id: 2001,
        metric: "hardware_fan_speed_rpm",
        operator: "Less Than (<)",
        threshold: "300",
        enabled: true,
        note: "Tachometer below stall floor",
      },
      {
        id: 2002,
        metric: "hardware_fan_pwm_percentage",
        operator: "Greater Than (>)",
        threshold: "50",
        enabled: true,
        note: "Exclude intentional zero-RPM idle mode",
      },
    ],
    duration: "30",
    durationUnit: "Seconds",
    interval: "Every 10 seconds",
    occurrences: "3",
    outOf: "3",
  },
  {
    id: "disk-predictive-failure",
    name: "NVMe/SSD Predictive Wearout & Media Errors",
    severity: "warning",
    description: "Triggers early replacement warning when S.M.A.R.T. health drops below 15% OR uncorrectable errors appear.",
    category: "Disk Hardware Health",
    logicalOp: "OR",
    conditions: [
      {
        id: 3001,
        metric: "hardware_disk_smart_status",
        operator: "Less or Equal (<=)",
        threshold: "15",
        enabled: true,
        note: "NAND endurance nearing exhaustion",
      },
      {
        id: 3002,
        metric: "hardware_disk_uncorrectable_errors",
        operator: "Greater or Equal (>=)",
        threshold: "1",
        enabled: true,
        note: "Any unrecoverable sector fault",
      },
    ],
    duration: "5",
    durationUnit: "Minutes",
    interval: "Every 1 minute",
    occurrences: "3",
    outOf: "5",
  },
  {
    id: "psu-rail-droop",
    name: "ATX +12V Power Rail Brownout / Voltage Droop",
    severity: "critical",
    description: "Detects PSU regulation failure when +12V rail sags below 11.40V ATX tolerance under load.",
    category: "Power & Voltage",
    logicalOp: "AND",
    conditions: [
      {
        id: 4001,
        metric: "hardware_voltage_rail_12v",
        operator: "Less Than (<)",
        threshold: "11.4",
        enabled: true,
        note: "Below -5% ATX spec lower bound",
      },
    ],
    duration: "15",
    durationUnit: "Seconds",
    interval: "Every 10 seconds",
    occurrences: "2",
    outOf: "2",
  },
  {
    id: "ecc-memory-degradation",
    name: "DIMM ECC Error Storm & Thermal Stress",
    severity: "warning",
    description: "Catches failing RAM modules exhibiting high correctable ECC rates or uncorrectable MCE faults.",
    category: "Memory & ECC",
    logicalOp: "OR",
    conditions: [
      {
        id: 5001,
        metric: "hardware_memory_ecc_ce_rate",
        operator: "Greater Than (>)",
        threshold: "100",
        enabled: true,
        note: "Rapid single-bit error accumulation",
      },
      {
        id: 5002,
        metric: "hardware_memory_ecc_ue_count",
        operator: "Greater or Equal (>=)",
        threshold: "1",
        enabled: true,
        note: "Fatal multi-bit parity failure",
      },
    ],
    duration: "1",
    durationUnit: "Minutes",
    interval: "Every 15 seconds",
    occurrences: "3",
    outOf: "4",
  },
  {
    id: "gpu-hbm-thermal",
    name: "GPU HBM Memory Thermal & XID Fault Guard",
    severity: "critical",
    description: "Protects compute accelerators from HBM thermal runaway or critical driver XID interrupts.",
    category: "GPU & Accelerators",
    logicalOp: "OR",
    conditions: [
      {
        id: 6001,
        metric: "hardware_gpu_memory_temperature_celsius",
        operator: "Greater Than (>)",
        threshold: "95",
        enabled: true,
        note: "HBM stack approaching Tjunction max",
      },
      {
        id: 6002,
        metric: "hardware_gpu_xid_errors",
        operator: "Greater or Equal (>=)",
        threshold: "1",
        enabled: true,
        note: "Hardware bus or ECC XID interrupt",
      },
    ],
    duration: "30",
    durationUnit: "Seconds",
    interval: "Every 10 seconds",
    occurrences: "2",
    outOf: "3",
  },
]

const DEFAULT_CONDITION = {
  id: 1,
  metric: "hardware_cpu_average_temperature_celsius",
  operator: "Greater Than (>)",
  threshold: "82",
  enabled: true,
  note: "",
}

// ============================================================================
// 4. HELPER UTILITIES (VALIDATION, PROMQL & TELEMETRY WAVEFORM GENERATOR)
// ============================================================================

function evaluateConditionAgainstValue(cond, val) {
  if (!cond || cond.enabled === false) return false
  const threshold = parseFloat(cond.threshold)
  const numericVal = parseFloat(val)
  if (Number.isNaN(threshold) || Number.isNaN(numericVal)) return false

  switch (cond.operator) {
    case "Greater Than (>)":
      return numericVal > threshold
    case "Greater or Equal (>=)":
      return numericVal >= threshold
    case "Less Than (<)":
      return numericVal < threshold
    case "Less or Equal (<=)":
      return numericVal <= threshold
    case "Equals (=)":
      return Math.abs(numericVal - threshold) < 0.0001
    default:
      return false
  }
}

function generateSyntheticSeries(metricKey, baseline, spikePeak, pattern = "spike") {
  const meta = ALL_METRICS[metricKey] || { min: 0, max: 100 }
  const points = []
  const totalPoints = 40

  for (let i = 0; i < totalPoints; i++) {
    const t = i / (totalPoints - 1)
    let value = baseline

    if (pattern === "spike") {
      // Smooth Gaussian-like thermal/load spike centered around t = 0.65
      const dist = (t - 0.65) / 0.14
      const wave = Math.exp(-0.5 * dist * dist)
      const jitter = Math.sin(i * 1.9) * ((spikePeak - baseline) * 0.04)
      value = baseline + (spikePeak - baseline) * wave + jitter
    } else if (pattern === "ramp") {
      // Gradual monotonic degradation ramp
      const jitter = Math.cos(i * 2.3) * ((spikePeak - baseline) * 0.03)
      value = baseline + (spikePeak - baseline) * Math.pow(t, 1.4) + jitter
    } else if (pattern === "oscillate") {
      // Periodic flapping around threshold
      const osc = (Math.sin(i * 0.75) + 1) / 2
      value = baseline + (spikePeak - baseline) * osc
    }

    const clamped = Math.max(meta.min, Math.min(meta.max, Number(value.toFixed(2))))
    points.push({
      index: i,
      minuteLabel: `-${(totalPoints - 1 - i)}m`,
      value: clamped,
    })
  }
  return points
}

// ============================================================================
// 5. MAIN WIZARD COMPONENT: Step5Hardware
// ============================================================================

export default function Step5Hardware({ form, setForm }) {
  const category = form.hardwareCategory || "CPU Temperature"

  const availableMetrics = useMemo(() => {
    if (form.hardwareShowAllMetrics) {
      return ALL_METRIC_KEYS
    }
    return CATEGORY_METRICS[category] || CATEGORY_METRICS["CPU Temperature"]
  }, [category, form.hardwareShowAllMetrics])

  const defaultMetric = availableMetrics.includes(form.hardwareMetric)
    ? form.hardwareMetric
    : availableMetrics[0]

  // Primary Conditions State
  const [conditions, setConditions] = useState(() => {
    if (Array.isArray(form.hardwareConditions) && form.hardwareConditions.length > 0) {
      return form.hardwareConditions.map(c => ({
        enabled: true,
        note: "",
        ...c,
      }))
    }
    return [
      {
        ...DEFAULT_CONDITION,
        metric: defaultMetric,
        operator: DEFAULT_OPERATORS[defaultMetric],
        threshold:
          form.condThreshold ||
          String(ALL_METRICS[defaultMetric]?.defaultThreshold ?? "80"),
      },
    ]
  })

  // UI & Sub-view States
  const [activeTab, setActiveTab] = useState("builder") // "builder" | "promql" | "presets" | "simulator" | "diagnostics"
  const [logicalOperator, setLogicalOperator] = useState(form.hardwareLogicalOp || "AND")
  const [useRawPromqlExpressions, setUseRawPromqlExpressions] = useState(false)
  const [expandedConditionNotes, setExpandedConditionNotes] = useState({})
  const [copiedKey, setCopiedKey] = useState(null)

  // Simulator Interactive State
  const firstActiveCondition = useMemo(
    () => conditions.find(c => c.enabled !== false) || conditions[0] || DEFAULT_CONDITION,
    [conditions]
  )
  const firstMeta = ALL_METRICS[firstActiveCondition.metric] || ALL_METRICS.hardware_cpu_average_temperature_celsius

  const [simulatedValue, setSimulatedValue] = useState(() => {
    const t = parseFloat(firstActiveCondition.threshold)
    return Number.isNaN(t) ? firstMeta.defaultThreshold : t
  })
  const [simWaveformPattern, setSimWaveformPattern] = useState("spike")
  const [isSimPlaying, setIsSimPlaying] = useState(false)

  // Sync conditions & logical operator upward to parent wizard form
  useEffect(() => {
    setForm(f => ({
      ...f,
      hardwareConditions: conditions,
      hardwareLogicalOp: logicalOperator,
    }))
  }, [conditions, logicalOperator, setForm])

  // Keep simulatedValue bounded when primary metric changes
  useEffect(() => {
    const meta = ALL_METRICS[firstActiveCondition.metric]
    if (!meta) return
    setSimulatedValue(prev => {
      if (prev < meta.min || prev > meta.max) {
        return meta.defaultThreshold
      }
      return prev
    })
  }, [firstActiveCondition.metric])

  // Live animated simulation ticker
  useEffect(() => {
    if (!isSimPlaying) return
    const meta = ALL_METRICS[firstActiveCondition.metric] || { min: 0, max: 100, step: 1 }
    const timer = setInterval(() => {
      setSimulatedValue(prev => {
        const span = (meta.max - meta.min) * 0.08
        const delta = (Math.random() - 0.48) * span
        const next = Math.max(meta.min, Math.min(meta.max, prev + delta))
        return Number(next.toFixed(meta.step < 1 ? 2 : 0))
      })
    }, 900)
    return () => clearInterval(timer)
  }, [isSimPlaying, firstActiveCondition.metric])

  // --------------------------------------------------------------------------
  // CONDITION CRUD & REORDERING HANDLERS
  // --------------------------------------------------------------------------

  const syncLegacyFirstCondition = useCallback(
    (updatedList) => {
      const primary = updatedList[0]
      if (!primary) return
      setForm(f => ({
        ...f,
        hardwareMetric: primary.metric,
        condMetric: primary.metric,
        condOperator: primary.operator,
        condThreshold: primary.threshold,
      }))
    },
    [setForm]
  )

  const addCondition = useCallback(() => {
    // Pick a metric not yet used in the current category if possible
    const usedMetrics = new Set(conditions.map(c => c.metric))
    const nextMetric =
      availableMetrics.find(m => !usedMetrics.has(m)) || availableMetrics[0]

    const newCond = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      metric: nextMetric,
      operator: DEFAULT_OPERATORS[nextMetric] || "Greater Than (>)",
      threshold: String(ALL_METRICS[nextMetric]?.defaultThreshold ?? "50"),
      enabled: true,
      note: "",
    }
    setConditions(prev => [...prev, newCond])
  }, [availableMetrics, conditions])

  const duplicateCondition = useCallback((condToCopy) => {
    const clone = {
      ...condToCopy,
      id: Date.now() + Math.floor(Math.random() * 1000),
      note: condToCopy.note ? `${condToCopy.note} (copy)` : "",
    }
    setConditions(prev => {
      const idx = prev.findIndex(x => x.id === condToCopy.id)
      const next = [...prev]
      next.splice(idx + 1, 0, clone)
      return next
    })
  }, [])

  const removeCondition = useCallback(
    (id) => {
      setConditions(prev => {
        if (prev.length <= 1) return prev
        const next = prev.filter(x => x.id !== id)
        syncLegacyFirstCondition(next)
        return next
      })
    },
    [syncLegacyFirstCondition]
  )

  const moveCondition = useCallback(
    (index, direction) => {
      setConditions(prev => {
        const targetIndex = index + direction
        if (targetIndex < 0 || targetIndex >= prev.length) return prev
        const next = [...prev]
        const [moved] = next.splice(index, 1)
        next.splice(targetIndex, 0, moved)
        syncLegacyFirstCondition(next)
        return next
      })
    },
    [syncLegacyFirstCondition]
  )

  const updateCondition = useCallback(
    (id, field, value) => {
      setConditions(prev => {
        const next = prev.map(x => {
          if (x.id !== id) return x
          if (field === "metric") {
            const meta = ALL_METRICS[value]
            return {
              ...x,
              metric: value,
              operator: DEFAULT_OPERATORS[value] || "Greater Than (>)",
              threshold: String(meta?.defaultThreshold ?? ""),
            }
          }
          return {
            ...x,
            [field]: value,
          }
        })
        syncLegacyFirstCondition(next)
        return next
      })
    },
    [syncLegacyFirstCondition]
  )

  const toggleNoteEditor = (id) => {
    setExpandedConditionNotes(prev => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const applyPreset = (preset) => {
    setForm(f => ({
      ...f,
      hardwareCategory: preset.category,
      condDuration: preset.duration,
      condDurationUnit: preset.durationUnit,
      condInterval: preset.interval,
      condOccurrences: preset.occurrences,
      condOutOf: preset.outOf,
    }))
    setLogicalOperator(preset.logicalOp)
    const clonedConditions = preset.conditions.map((c, idx) => ({
      ...c,
      id: Date.now() + idx,
    }))
    setConditions(clonedConditions)
    syncLegacyFirstCondition(clonedConditions)
    setActiveTab("builder")
  }

  const handleCopyText = (key, text) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1800)
    }
  }

  // --------------------------------------------------------------------------
  // REAL-TIME RULE LINTER & VALIDATION DIAGNOSTICS
  // --------------------------------------------------------------------------

  const validationIssues = useMemo(() => {
    const issues = []
    const enabledConditions = conditions.filter(c => c.enabled !== false)

    if (enabledConditions.length === 0) {
      issues.push({
        level: "error",
        code: "NO_ACTIVE_CONDITIONS",
        title: "No active conditions enabled",
        detail: "At least one condition must be enabled for the alert rule to evaluate.",
      })
    }

    enabledConditions.forEach((cond, idx) => {
      const meta = ALL_METRICS[cond.metric]
      const val = parseFloat(cond.threshold)

      if (cond.threshold === "" || Number.isNaN(val)) {
        issues.push({
          level: "error",
          code: "MISSING_THRESHOLD",
          title: `Condition #${idx + 1}: Missing numeric threshold`,
          detail: `Enter a valid threshold value for ${meta?.label || cond.metric}.`,
        })
        return
      }

      if (meta) {
        if (val < meta.min || val > meta.max) {
          issues.push({
            level: "error",
            code: "OUT_OF_SENSOR_BOUNDS",
            title: `Condition #${idx + 1}: Threshold (${val}${meta.unit}) outside physical sensor range`,
            detail: `${meta.label} supports values between ${meta.min}${meta.unit} and ${meta.max}${meta.unit}.`,
            fix: () => updateCondition(cond.id, "threshold", String(meta.defaultThreshold)),
          })
        } else if (
          cond.operator.includes("Greater") &&
          val < meta.safeRange[0]
        ) {
          issues.push({
            level: "warning",
            code: "NOISY_THRESHOLD_LOW",
            title: `Condition #${idx + 1}: Threshold (${val}${meta.unit}) is inside normal idle range`,
            detail: `Normal operating range for ${meta.shortLabel} is ${meta.safeRange[0]}–${meta.safeRange[1]}${meta.unit}. This may cause alert fatigue.`,
          })
        } else if (
          cond.operator.includes("Less") &&
          val > meta.safeRange[1]
        ) {
          issues.push({
            level: "warning",
            code: "NOISY_THRESHOLD_HIGH",
            title: `Condition #${idx + 1}: Upper-bound comparison triggers during normal operation`,
            detail: `Triggering when ${meta.shortLabel} < ${val}${meta.unit} will fire continuously during normal loads (${meta.safeRange[0]}–${meta.safeRange[1]}${meta.unit}).`,
          })
        }
      }
    })

    // Check contradictory duplicate metrics under AND
    if (logicalOperator === "AND" && enabledConditions.length > 1) {
      const byMetric = {}
      enabledConditions.forEach(c => {
        byMetric[c.metric] = byMetric[c.metric] || []
        byMetric[c.metric].push(c)
      })
      Object.entries(byMetric).forEach(([metricKey, list]) => {
        if (list.length > 1) {
          const gt = list.find(x => x.operator.includes("Greater"))
          const lt = list.find(x => x.operator.includes("Less"))
          if (gt && lt && parseFloat(gt.threshold) >= parseFloat(lt.threshold)) {
            issues.push({
              level: "error",
              code: "IMPOSSIBLE_AND_RANGE",
              title: `Contradictory bounds on ${ALL_METRICS[metricKey]?.shortLabel || metricKey}`,
              detail: `A metric cannot simultaneously be > ${gt.threshold} AND < ${lt.threshold}. Switch logic to OR or adjust thresholds.`,
            })
          }
        }
      })
    }

    // Check Duration vs Evaluation Interval Nyquist consistency
    const durVal = parseFloat(form.condDuration)
    const durUnit = form.condDurationUnit || "Minutes"
    const intervalStr = form.condInterval || "Every 30 seconds"
    const durSeconds = Number.isNaN(durVal) ? 0 : durVal * (DURATION_TO_SECONDS[durUnit] || 60)
    const intervalSeconds = INTERVAL_TO_SECONDS[intervalStr] || 30

    if (durSeconds > 0 && durSeconds < intervalSeconds) {
      issues.push({
        level: "warning",
        code: "DURATION_SHORTER_THAN_POLL",
        title: "Sustained duration is shorter than polling interval",
        detail: `Duration (${durSeconds}s) is shorter than evaluation frequency (${intervalSeconds}s). Only 1 sample will be evaluated before firing.`,
      })
    }

    // Check Sliding Window Occurrences
    const occ = parseInt(form.condOccurrences, 10)
    const outOf = parseInt(form.condOutOf, 10)
    if (!Number.isNaN(occ) && !Number.isNaN(outOf) && occ > outOf) {
      issues.push({
        level: "error",
        code: "INVALID_SLIDING_WINDOW",
        title: "Required occurrences exceed total window samples",
        detail: `Cannot require ${occ} positive samples out of ${outOf} total evaluations.`,
        fix: () => setForm(f => ({ ...f, condOccurrences: String(outOf) })),
      })
    }

    return issues
  }, [conditions, logicalOperator, form.condDuration, form.condDurationUnit, form.condInterval, form.condOccurrences, form.condOutOf, setForm, updateCondition])

  const errorCount = validationIssues.filter(i => i.level === "error").length
  const warningCount = validationIssues.filter(i => i.level === "warning").length

  // --------------------------------------------------------------------------
  // PROMQL & ALERTMANAGER YAML COMPILER
  // --------------------------------------------------------------------------

  const durationUnit = form.condDurationUnit || "Minutes"

  const promqlDurationSuffix = useMemo(() => {
    const val = parseInt(form.condDuration, 10)
    if (Number.isNaN(val) || val <= 0) return "1m"
    const unitMap = { Seconds: "s", Minutes: "m", Hours: "h" }
    return `${val}${unitMap[durationUnit] || "m"}`
  }, [form.condDuration, durationUnit])

  const generatedPromQL = useMemo(() => {
    const active = conditions.filter(c => c.enabled !== false)
    if (active.length === 0) return "# No active conditions configured"

    const clauses = active.map(c => {
      const op = OPERATOR_SYMBOLS[c.operator] || ">"
      const meta = ALL_METRICS[c.metric]
      const lhs = useRawPromqlExpressions && meta?.promqlTemplate ? meta.promqlTemplate : c.metric
      const thresh = c.threshold !== "" ? c.threshold : "0"
      return `(${lhs} ${op} ${thresh})`
    })

    const joiner = logicalOperator === "AND" ? "\n  and on(instance)\n" : "\n  or on(instance)\n"
    return clauses.join(joiner)
  }, [conditions, logicalOperator, useRawPromqlExpressions])

  const generatedAlertmanagerYAML = useMemo(() => {
    const ruleName = (form.ruleName || `Hardware${category.replace(/[^a-zA-Z0-9]/g, "")}Alert`)
    const indentedExpr = generatedPromQL
      .split("\n")
      .map(line => `          ${line}`)
      .join("\n")

    return `groups:
  - name: hardware-telemetry-rules
    interval: ${INTERVAL_TO_SECONDS[form.condInterval || "Every 30 seconds"] || 30}s
    rules:
      - alert: ${ruleName}
        expr: |
${indentedExpr}
        for: ${promqlDurationSuffix}
        labels:
          severity: ${form.severity || "critical"}
          subsystem: "${category.toLowerCase()}"
        annotations:
          summary: "${firstMeta.label || "Hardware metric"} threshold breached on {{ $labels.instance }}"
          description: "Metric {{ $labels.instance }} evaluated true for ${form.condDuration || 1} ${durationUnit.toLowerCase()} (current value: {{ $value }}${firstMeta.unit || ""})."
          remediation: "${firstMeta.remediationHint || "Inspect physical node hardware telemetry."}"`
  }, [form.ruleName, form.severity, form.condInterval, form.condDuration, category, generatedPromQL, promqlDurationSuffix, durationUnit, firstMeta])

  // --------------------------------------------------------------------------
  // SIMULATOR TELEMETRY SERIES & BREACH ANALYSIS
  // --------------------------------------------------------------------------

  const simulationTriggered = useMemo(() => {
    const active = conditions.filter(c => c.enabled !== false)
    if (active.length === 0) return false
    // Evaluate primary condition against slider, and assume secondary conditions follow primary state for sandbox clarity
    return evaluateConditionAgainstValue(firstActiveCondition, simulatedValue)
  }, [conditions, firstActiveCondition, simulatedValue])

  const syntheticChartData = useMemo(() => {
    const thresh = parseFloat(firstActiveCondition.threshold)
    const targetThresh = Number.isNaN(thresh) ? firstMeta.defaultThreshold : thresh
    const isLessThan = firstActiveCondition.operator.includes("Less")

    const baseline = isLessThan
      ? Math.min(firstMeta.max, targetThresh + (firstMeta.max - firstMeta.min) * 0.25)
      : Math.max(firstMeta.min, targetThresh - (firstMeta.max - firstMeta.min) * 0.25)

    const peak = isLessThan
      ? Math.max(firstMeta.min, targetThresh - (firstMeta.max - firstMeta.min) * 0.15)
      : Math.min(firstMeta.max, targetThresh + (firstMeta.max - firstMeta.min) * 0.15)

    const series = generateSyntheticSeries(
      firstActiveCondition.metric,
      baseline,
      peak,
      simWaveformPattern
    )

    let breachCount = 0
    const enriched = series.map(pt => {
      const breached = evaluateConditionAgainstValue(firstActiveCondition, pt.value)
      if (breached) breachCount++
      return { ...pt, breached }
    })

    return {
      points: enriched,
      threshold: targetThresh,
      breachCount,
    }
  }, [firstActiveCondition, firstMeta, simWaveformPattern])

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Panel className="p-6 space-y-6">
      {/* -------------------------------------------------------------------- */}
      {/* TOP HEADER & SUB-VIEW NAVIGATION TABS                                */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
              5. Conditions (When)
            </span>
            {errorCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 border border-destructive/30 px-2 py-0.5 font-mono text-[10px] text-destructive font-semibold">
                <AlertOctagon className="size-3" />
                {errorCount} {errorCount === 1 ? "Error" : "Errors"}
              </span>
            )}
            {errorCount === 0 && warningCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-mono text-[10px] text-amber-500 font-semibold">
                <AlertTriangle className="size-3" />
                {warningCount} {warningCount === 1 ? "Warning" : "Warnings"}
              </span>
            )}
            {errorCount === 0 && warningCount === 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-mono text-[10px] text-emerald-500 font-semibold">
                <CheckCircle2 className="size-3" />
                Valid Rule
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Define hardware sensor thresholds, multi-condition logic, evaluation windows, and PromQL expressions.
          </p>
        </div>

        {/* Navigation Pill Bar */}
        <div className="flex flex-wrap items-center gap-1 bg-secondary/40 p-1 rounded-lg border border-border">
          {[
            { id: "builder", label: "Condition Builder", icon: Sliders },
            { id: "presets", label: "Presets", icon: Sparkles, badge: PRESET_TEMPLATES.length },
            { id: "simulator", label: "Live Simulator", icon: Activity },
            { id: "promql", label: "PromQL & YAML", icon: FileCode2 },
            { id: "diagnostics", label: "Linter", icon: Wrench, badge: validationIssues.length || null },
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-[11px] transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
                {tab.badge ? (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] ${
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* SUBSYSTEM CONTEXT BAR & CROSS-CATEGORY METRIC SCOPE TOGGLE           */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/60 px-3.5 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
            Subsystem:
          </span>
          <span className="rounded border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] text-primary font-semibold">
            {category}
          </span>
          <span className="hidden sm:inline font-mono text-[10px] text-muted-foreground">
            ({availableMetrics.length} metrics available)
          </span>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={Boolean(form.hardwareShowAllMetrics)}
            onChange={e =>
              setForm(f => ({
                ...f,
                hardwareShowAllMetrics: e.target.checked,
              }))
            }
            className="rounded border-border accent-primary cursor-pointer"
          />
          <span className="font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            Allow cross-subsystem metrics ({ALL_METRIC_KEYS.length} total)
          </span>
        </label>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: CONDITION BUILDER                                             */}
      {/* ==================================================================== */}
      {activeTab === "builder" && (
        <div className="space-y-6">
          {/* Logical Combinator Bar (Visible when >= 2 conditions) */}
          {conditions.length > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-primary shrink-0" />
                <div>
                  <p className="font-mono text-xs font-bold text-foreground">
                    Multi-Condition Evaluation Gate
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Choose whether all hardware conditions must breach simultaneously or any single condition triggers the rule.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setLogicalOperator("AND")}
                  className={`px-3 py-1.5 rounded-md font-mono text-xs border transition-colors cursor-pointer ${
                    logicalOperator === "AND"
                      ? "bg-primary text-primary-foreground border-primary font-bold"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  AND (All Must Match)
                </button>
                <button
                  type="button"
                  onClick={() => setLogicalOperator("OR")}
                  className={`px-3 py-1.5 rounded-md font-mono text-xs border transition-colors cursor-pointer ${
                    logicalOperator === "OR"
                      ? "bg-primary text-primary-foreground border-primary font-bold"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  OR (Any Match)
                </button>
              </div>
            </div>
          )}

          {/* Condition Rows List */}
          <div className="space-y-3">
            <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center pb-1.5 border-b border-border px-2">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider w-12">
                Order
              </span>
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                Hardware Metric
              </span>
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider w-48 text-center">
                Operator
              </span>
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider w-36 text-center">
                Threshold
              </span>
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider w-28 text-right">
                Actions
              </span>
            </div>

            {conditions.map((cond, idx) => {
              const meta = ALL_METRICS[cond.metric] || {}
              const operators = METRIC_OPERATORS[cond.metric] || ["Greater Than (>)"]
              const MetricIcon = meta.icon || Cpu
              const isEnabled = cond.enabled !== false
              const noteOpen = Boolean(expandedConditionNotes[cond.id])

              return (
                <div key={cond.id} className="space-y-2">
                  {/* Connector Pill Between Conditions */}
                  {idx > 0 && (
                    <div className="flex items-center gap-2 py-0.5 px-4">
                      <div className="h-px flex-1 bg-border" />
                      <span className="rounded bg-secondary px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary border border-border">
                        {logicalOperator}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}

                  {/* Condition Card */}
                  <div
                    className={`rounded-lg border p-3.5 transition-all ${
                      isEnabled
                        ? "border-border bg-card shadow-2xs"
                        : "border-border/50 bg-card/30 opacity-60"
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center">
                      {/* Reorder & Index Controls */}
                      <div className="flex md:flex-col items-center justify-between md:justify-center gap-1 w-full md:w-12">
                        <span className="font-mono text-[10px] font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveCondition(idx, -1)}
                            disabled={idx === 0}
                            title="Move condition up"
                            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <ChevronUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveCondition(idx, 1)}
                            disabled={idx === conditions.length - 1}
                            title="Move condition down"
                            className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <ChevronDown className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Metric Selector + Telemetry Metadata */}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                            <MetricIcon className="size-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <SelectBox
                              value={cond.metric}
                              options={availableMetrics}
                              onChange={v => updateCondition(cond.id, "metric", v)}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-9 text-[11px] text-muted-foreground">
                          <span>{meta.description}</span>
                          {meta.safeRange && (
                            <span className="font-mono text-[10px] text-emerald-500/90 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                              Safe: {meta.safeRange[0]}–{meta.safeRange[1]} {meta.unit}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Operator Selector */}
                      <div className="w-full md:w-48">
                        <SelectBox
                          value={cond.operator}
                          options={operators}
                          onChange={v => updateCondition(cond.id, "operator", v)}
                          className="w-full"
                        />
                      </div>

                      {/* Threshold Input + Quick Default Reset */}
                      <div className="flex items-center gap-1.5 w-full md:w-36">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min={meta.min ?? 0}
                            max={meta.max ?? 100000}
                            step={meta.step ?? "any"}
                            value={cond.threshold}
                            onChange={e =>
                              updateCondition(cond.id, "threshold", e.target.value)
                            }
                            placeholder="Value"
                            className="w-full rounded-md border border-border bg-background px-2.5 py-2.5 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
                          />
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-10">
                          {meta.unit || ""}
                        </span>
                      </div>

                      {/* Row Action Buttons: Note, Enable/Disable, Duplicate, Delete */}
                      <div className="flex items-center justify-end gap-1 w-full md:w-28 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleNoteEditor(cond.id)}
                          title="Add operator annotation note"
                          className={`flex size-8 items-center justify-center rounded-md border transition-colors cursor-pointer ${
                            cond.note || noteOpen
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <BookOpen className="size-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => updateCondition(cond.id, "enabled", !isEnabled)}
                          title={isEnabled ? "Mute condition" : "Enable condition"}
                          className="flex size-8 items-center justify-center rounded-md border border-border bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          {isEnabled ? (
                            <Eye className="size-3.5" />
                          ) : (
                            <EyeOff className="size-3.5 text-amber-500" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => duplicateCondition(cond)}
                          title="Duplicate condition"
                          className="flex size-8 items-center justify-center rounded-md border border-border bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <CopyPlus className="size-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeCondition(cond.id)}
                          disabled={conditions.length === 1}
                          title="Delete condition"
                          className="flex size-8 items-center justify-center rounded-md border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Condition Annotation Input */}
                    {noteOpen && (
                      <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center gap-2 pl-0 md:pl-14">
                        <span className="font-mono text-[10px] text-muted-foreground uppercase shrink-0">
                          Runbook Note:
                        </span>
                        <input
                          type="text"
                          value={cond.note || ""}
                          onChange={e => updateCondition(cond.id, "note", e.target.value)}
                          placeholder="e.g., Verify chassis intake fan RPM before escalating..."
                          className="flex-1 rounded border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground focus:border-ring focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Add Condition Button */}
            <button
              type="button"
              onClick={addCondition}
              className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-border bg-card/40 px-4 py-2.5 font-mono text-xs text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
            >
              <Plus className="size-3.5 text-primary" />
              Add Hardware Condition ({logicalOperator})
            </button>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* TEMPORAL EVALUATION WINDOW & SLIDING DEBOUNCE                    */}
          {/* ---------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            {/* Duration & Polling Frequency Card */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sliders className="size-3.5 text-primary" />
                  Sustained Duration & Evaluation Rate
                </label>
                <span className="font-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded">
                  for: {promqlDurationSuffix}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                    Persist Duration
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      value={form.condDuration ?? ""}
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          condDuration: e.target.value,
                        }))
                      }
                      placeholder="2"
                      className="w-20 rounded-md border border-border bg-background px-2.5 py-2 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
                    />
                    <SelectBox
                      value={durationUnit}
                      options={["Seconds", "Minutes", "Hours"]}
                      onChange={v =>
                        setForm(f => ({
                          ...f,
                          condDurationUnit: v,
                        }))
                      }
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <span className="block font-mono text-[10px] text-muted-foreground uppercase mb-1">
                    Evaluation Frequency <span className="text-primary">*</span>
                  </span>
                  <SelectBox
                    value={form.condInterval || "Every 30 seconds"}
                    options={[
                      "Every 10 seconds",
                      "Every 15 seconds",
                      "Every 30 seconds",
                      "Every 1 minute",
                      "Every 5 minutes",
                    ]}
                    onChange={v =>
                      setForm(f => ({
                        ...f,
                        condInterval: v,
                      }))
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Prevents transient sensor spikes from triggering false pages. The expression must remain true continuously for{" "}
                <span className="text-foreground font-mono">
                  {form.condDuration || "1"} {durationUnit.toLowerCase()}
                </span>
                .
              </p>
            </div>

            {/* Sliding Window Occurrences Card */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Activity className="size-3.5 text-primary" />
                  Sliding Window Occurrences (M-of-N)
                </label>
                <span className="font-mono text-[10px] text-muted-foreground">
                  Flap Suppression
                </span>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="number"
                  min="1"
                  value={form.condOccurrences ?? ""}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      condOccurrences: e.target.value,
                    }))
                  }
                  placeholder="3"
                  className="w-20 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
                />

                <span className="font-mono text-xs text-muted-foreground">
                  breaches out of
                </span>

                <input
                  type="number"
                  min="1"
                  value={form.condOutOf ?? ""}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      condOutOf: e.target.value,
                    }))
                  }
                  placeholder="5"
                  className="w-20 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground text-center focus:border-ring focus:outline-none"
                />

                <span className="font-mono text-xs text-muted-foreground">
                  samples
                </span>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Useful for noisy sensors (e.g., intermittent ECC errors or fluctuating fan tachometers) where{" "}
                <span className="font-mono text-foreground">M</span> out of{" "}
                <span className="font-mono text-foreground">N</span> consecutive polls breach the threshold.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: ENTERPRISE PRESET RULE TEMPLATES                              */}
      {/* ==================================================================== */}
      {activeTab === "presets" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Validated Hardware Monitoring Blueprints
              </h4>
              <p className="text-xs text-muted-foreground">
                Apply pre-tuned multi-condition rules modeled on datacenter SRE thermal, storage, and power standards.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRESET_TEMPLATES.map(preset => (
              <div
                key={preset.id}
                className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between space-y-4 hover:border-primary/50 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary font-semibold">
                      {preset.category}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase font-bold ${
                        preset.severity === "critical"
                          ? "bg-destructive/15 text-destructive border border-destructive/30"
                          : "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                      }`}
                    >
                      {preset.severity}
                    </span>
                  </div>

                  <h5 className="font-mono text-xs font-bold text-foreground">
                    {preset.name}
                  </h5>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {preset.description}
                  </p>

                  {/* Mini Condition Breakdown */}
                  <div className="rounded bg-secondary/40 border border-border/80 p-2.5 space-y-1 font-mono text-[10px]">
                    {preset.conditions.map((c, idx) => (
                      <div key={c.id} className="text-foreground">
                        {idx > 0 && (
                          <span className="text-primary font-bold mr-1.5">
                            {preset.logicalOp}
                          </span>
                        )}
                        <span>{ALL_METRICS[c.metric]?.shortLabel || c.metric}</span>{" "}
                        <span className="text-primary">{OPERATOR_SYMBOLS[c.operator]}</span>{" "}
                        <span className="font-bold">{c.threshold}</span>
                        <span>{ALL_METRICS[c.metric]?.unit}</span>
                      </div>
                    ))}
                    <div className="text-muted-foreground pt-1 border-t border-border/50">
                      Window: {preset.duration} {preset.durationUnit.toLowerCase()} •{" "}
                      {preset.occurrences}/{preset.outOf} samples
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="w-full rounded-md border border-primary/40 bg-primary/10 py-2 font-mono text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                >
                  Load Blueprint Into Builder
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: INTERACTIVE TELEMETRY WAVEFORM & THRESHOLD SIMULATOR          */}
      {/* ==================================================================== */}
      {activeTab === "simulator" && (
        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Activity className="size-4 text-primary" />
                  Interactive Sensor Telemetry Sandbox
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Scrub live sensor readings or inspect a 40-minute synthetic telemetry trace against your threshold.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSimPlaying(p => !p)}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 font-mono text-xs text-foreground hover:bg-secondary/80 cursor-pointer"
                >
                  {isSimPlaying ? (
                    <>
                      <Pause className="size-3.5 text-amber-500" />
                      Pause Feed
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5 text-emerald-500" />
                      Stream Live Noise
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSimPlaying(false)
                    setSimulatedValue(firstMeta.defaultThreshold)
                  }}
                  className="flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Reset sensor value"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Instantaneous Slider Tester */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center rounded-lg border border-border/80 bg-background/60 p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {firstMeta.label}
                  </span>
                  <span className="font-mono text-sm font-bold text-primary">
                    {simulatedValue} {firstMeta.unit}
                  </span>
                </div>

                <input
                  type="range"
                  min={firstMeta.min}
                  max={firstMeta.max}
                  step={firstMeta.step}
                  value={simulatedValue}
                  onChange={e => setSimulatedValue(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />

                <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                  <span>Min: {firstMeta.min}{firstMeta.unit}</span>
                  <span>
                    Threshold: {OPERATOR_SYMBOLS[firstActiveCondition.operator]}{" "}
                    {firstActiveCondition.threshold || "—"}{firstMeta.unit}
                  </span>
                  <span>Max: {firstMeta.max}{firstMeta.unit}</span>
                </div>
              </div>

              {/* Trigger State Status Card */}
              <div
                className={`rounded-lg border p-4 flex items-start gap-3 transition-colors ${
                  simulationTriggered
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                }`}
              >
                {simulationTriggered ? (
                  <AlertTriangle className="size-5 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-mono text-xs font-bold uppercase">
                    {simulationTriggered
                      ? "Condition Breached — Pending Alert Timer"
                      : "Healthy — Within Operating Envelope"}
                  </p>
                  <p className="text-xs opacity-90">
                    {simulationTriggered
                      ? `Reading (${simulatedValue}${firstMeta.unit}) violates ${firstActiveCondition.operator} ${firstActiveCondition.threshold}${firstMeta.unit}. Alert fires after persisting for ${form.condDuration || 1} ${durationUnit.toLowerCase()}.`
                      : `Reading (${simulatedValue}${firstMeta.unit}) does not breach configured threshold.`}
                  </p>
                </div>
              </div>
            </div>

            {/* 40-Minute Synthetic Waveform Chart */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  40-Minute Time-Series Breach Projection ({syntheticChartData.breachCount} breach samples)
                </span>
                <div className="flex items-center gap-1.5">
                  {[
                    { id: "spike", label: "Thermal Spike" },
                    { id: "ramp", label: "Gradual Drift" },
                    { id: "oscillate", label: "Flapping Load" },
                  ].map(pat => (
                    <button
                      key={pat.id}
                      type="button"
                      onClick={() => setSimWaveformPattern(pat.id)}
                      className={`px-2.5 py-1 rounded font-mono text-[10px] border cursor-pointer ${
                        simWaveformPattern === pat.id
                          ? "border-primary bg-primary/15 text-primary font-bold"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {pat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom SVG Chart */}
              <div className="rounded-lg border border-border bg-background p-4">
                <svg
                  viewBox="0 0 640 170"
                  className="w-full h-44 overflow-visible"
                  role="img"
                  aria-label="Simulated hardware metric telemetry waveform"
                >
                  {/* Horizontal Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = 15 + ratio * 130
                    const valLabel = (
                      firstMeta.max -
                      ratio * (firstMeta.max - firstMeta.min)
                    ).toFixed(firstMeta.step < 1 ? 1 : 0)
                    return (
                      <g key={idx}>
                        <line
                          x1="44"
                          y1={y}
                          x2="628"
                          y2={y}
                          stroke="currentColor"
                          strokeOpacity="0.08"
                          strokeDasharray="3 3"
                        />
                        <text
                          x="38"
                          y={y + 3}
                          textAnchor="end"
                          className="fill-muted-foreground font-mono text-[9px]"
                        >
                          {valLabel}
                        </text>
                      </g>
                    )
                  })}

                  {/* Threshold Reference Line */}
                  {(() => {
                    const range = Math.max(0.001, firstMeta.max - firstMeta.min)
                    const clampedThresh = Math.max(
                      firstMeta.min,
                      Math.min(firstMeta.max, syntheticChartData.threshold)
                    )
                    const threshY =
                      15 + ((firstMeta.max - clampedThresh) / range) * 130

                    return (
                      <g>
                        <line
                          x1="44"
                          y1={threshY}
                          x2="628"
                          y2={threshY}
                          stroke="#ef4444"
                          strokeWidth="1.5"
                          strokeDasharray="6 4"
                        />
                        <text
                          x="626"
                          y={threshY - 5}
                          textAnchor="end"
                          className="fill-destructive font-mono text-[9px] font-bold"
                        >
                          THRESHOLD ({syntheticChartData.threshold}
                          {firstMeta.unit})
                        </text>
                      </g>
                    )
                  })()}

                  {/* Telemetry Polyline */}
                  {(() => {
                    const range = Math.max(0.001, firstMeta.max - firstMeta.min)
                    const pts = syntheticChartData.points
                    const polyPoints = pts
                      .map((pt, idx) => {
                        const x = 48 + (idx / (pts.length - 1)) * 576
                        const y =
                          15 + ((firstMeta.max - pt.value) / range) * 130
                        return `${x},${y}`
                      })
                      .join(" ")

                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="2"
                          points={polyPoints}
                        />
                        {pts.map((pt, idx) => {
                          const x = 48 + (idx / (pts.length - 1)) * 576
                          const y =
                            15 + ((firstMeta.max - pt.value) / range) * 130
                          return (
                            <circle
                              key={idx}
                              cx={x}
                              cy={y}
                              r={pt.breached ? 3.5 : 2}
                              fill={
                                pt.breached ? "#ef4444" : "hsl(var(--primary))"
                              }
                            />
                          )
                        })}
                      </>
                    )
                  })()}
                </svg>

                <div className="flex items-center justify-between pt-2 border-t border-border/60 font-mono text-[10px] text-muted-foreground">
                  <span>-40m ago</span>
                  <span>
                    Red nodes indicate samples breaching{" "}
                    {OPERATOR_SYMBOLS[firstActiveCondition.operator]}{" "}
                    {syntheticChartData.threshold}
                    {firstMeta.unit}
                  </span>
                  <span>Now</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: PROMQL & ALERTMANAGER YAML COMPILER                           */}
      {/* ==================================================================== */}
      {activeTab === "promql" && (
        <div className="space-y-4">
          {/* PromQL Expression Block */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="size-4 text-primary" />
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                  Compiled PromQL Evaluation Expression
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUseRawPromqlExpressions(v => !v)}
                  className="rounded border border-border bg-card px-2.5 py-1 font-mono text-[10px] text-foreground hover:bg-secondary cursor-pointer"
                >
                  {useRawPromqlExpressions
                    ? "Use Recording Rule Names"
                    : "Expand Node Exporter PromQL"}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyText("promql", generatedPromQL)}
                  className="flex items-center gap-1 rounded border border-primary/40 bg-primary/15 px-2.5 py-1 font-mono text-[10px] font-bold text-primary hover:bg-primary/25 cursor-pointer"
                >
                  {copiedKey === "promql" ? (
                    <>
                      <Check className="size-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      Copy PromQL
                    </>
                  )}
                </button>
              </div>
            </div>

            <pre className="rounded-md border border-border bg-background p-3.5 font-mono text-xs text-foreground overflow-x-auto leading-relaxed">
              <code>{generatedPromQL}</code>
            </pre>
          </div>

          {/* Full PrometheusRule CRD YAML Manifest */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="size-4 text-primary" />
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                  Alertmanager PrometheusRule Manifest (YAML)
                </h4>
              </div>

              <button
                type="button"
                onClick={() => handleCopyText("yaml", generatedAlertmanagerYAML)}
                className="flex items-center gap-1 rounded border border-border bg-secondary px-2.5 py-1 font-mono text-[10px] font-bold text-foreground hover:bg-secondary/80 cursor-pointer"
              >
                {copiedKey === "yaml" ? (
                  <>
                    <Check className="size-3 text-emerald-500" />
                    Copied YAML
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    Copy YAML
                  </>
                )}
              </button>
            </div>

            <pre className="rounded-md border border-border bg-background p-3.5 font-mono text-[11px] text-muted-foreground overflow-x-auto leading-relaxed">
              <code>{generatedAlertmanagerYAML}</code>
            </pre>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: RULE DIAGNOSTICS & LINTER                                     */}
      {/* ==================================================================== */}
      {activeTab === "diagnostics" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                  Hardware Rule Static Analyzer
                </h4>
                <p className="text-xs text-muted-foreground">
                  Verifies physical sensor boundaries, logical consistency, and Nyquist sampling ratios.
                </p>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {conditions.length} condition(s) inspected
              </span>
            </div>

            {validationIssues.length === 0 ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3 text-emerald-500">
                <CheckCircle2 className="size-5 shrink-0" />
                <div>
                  <p className="font-mono text-xs font-bold">
                    All Telemetry Checks Passed
                  </p>
                  <p className="text-xs opacity-90">
                    Thresholds fall within valid physical sensor ranges and sampling intervals align with persistence windows.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {validationIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      issue.level === "error"
                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-500"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {issue.level === "error" ? (
                        <AlertOctagon className="size-4 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5">
                        <p className="font-mono text-xs font-bold">
                          [{issue.code}] {issue.title}
                        </p>
                        <p className="text-xs opacity-90">{issue.detail}</p>
                      </div>
                    </div>

                    {issue.fix && (
                      <button
                        type="button"
                        onClick={issue.fix}
                        className="shrink-0 rounded border border-current px-3 py-1.5 font-mono text-[11px] font-bold hover:bg-background/20 cursor-pointer"
                      >
                        Auto-Fix
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PERSISTENT LIVE CONDITION PREVIEW FOOTER                             */}
      {/* ==================================================================== */}
      <div className="rounded-lg border border-primary/25 bg-primary/5 p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
            <Info className="size-3.5" />
            Condition Preview
          </p>
          <span className="font-mono text-[10px] text-muted-foreground">
            Eval: {form.condInterval || "Every 30 seconds"} • Window:{" "}
            {form.condOccurrences || "1"} of {form.condOutOf || "1"}
          </span>
        </div>

        <div className="space-y-1">
          {conditions
            .filter(c => c.enabled !== false)
            .map((cond, idx) => {
              const meta = ALL_METRICS[cond.metric] || {}
              return (
                <p key={cond.id} className="font-mono text-xs text-foreground">
                  {idx > 0 && (
                    <span className="text-primary font-bold mr-1.5">
                      {logicalOperator}
                    </span>
                  )}
                  <span className="font-semibold">{meta.label || cond.metric}</span>{" "}
                  <span className="text-primary font-bold">
                    {OPERATOR_SYMBOLS[cond.operator] || ">"}
                  </span>{" "}
                  <span className="font-bold">{cond.threshold || "—"}</span>{" "}
                  <span>{meta.unit || ""}</span>
                  {idx === 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      for {form.condDuration || "—"} {durationUnit.toLowerCase()}
                    </span>
                  )}
                </p>
              )
            })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-primary/15 font-mono text-[10px] text-muted-foreground">
          <span>
            Primary Prometheus Metric:{" "}
            <span className="text-primary">{firstActiveCondition.metric || "—"}</span>
          </span>
          {firstMeta.severityHint && (
            <span className="truncate max-w-xl">{firstMeta.severityHint}</span>
          )}
        </div>
      </div>
    </Panel>
  )
}