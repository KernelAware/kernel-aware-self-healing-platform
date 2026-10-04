import { Panel } from "@/components/kit"
import { SelectBox } from "../wizardComponents"

const NETWORK_METRICS = [
  "Upload Bandwidth",
  "Download Bandwidth",
  "Incoming Packet Drop Rate",
]

export default function Step4Network({ form, setForm }) {
  const updateNetworkTarget = (field, value) => {
    setForm(prev => {
      const targets = [...(prev.targets || [])]

      const target = {
        ...(targets[0] || {}),
        type: "network",
        name: field === "interface"
          ? value
          : (targets[0]?.name || prev.interface || "eth0"),
      }

      const metrics = [...(target.metrics || [])]
      const metricName =
        field === "metric" ? value : (prev.metric || NETWORK_METRICS[0])

      const existingMetric = metrics[0] || {
        conditions: [],
      }

      metrics[0] = {
        ...existingMetric,
        name: metricName,
        conditions: existingMetric.conditions || [],
      }

      target.metrics = metrics
      targets[0] = target

      return {
        ...prev,
        [field]: value,
        targets,
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
          Select the network metric and target for this rule.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block font-mono text-[11px] mb-1.5">
            Metric
          </label>
          <SelectBox
            value={form.metric || NETWORK_METRICS[0]}
            options={NETWORK_METRICS}
            onChange={value => updateNetworkTarget("metric", value)}
          />
        </div>

        <div>
          <label className="block font-mono text-[11px] mb-1.5">
            Network Interface
          </label>
          <SelectBox
            value={form.interface || "eth0"}
            options={["eth0", "eth1", "ens33", "wlan0"]}
            onChange={value => updateNetworkTarget("interface", value)}
          />
        </div>
      </div>
    </Panel>
  )
}