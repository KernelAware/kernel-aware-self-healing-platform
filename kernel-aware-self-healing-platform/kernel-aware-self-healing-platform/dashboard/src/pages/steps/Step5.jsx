import Step5Cpu from "./cpu/Step5Cpu"
import Step5Network from "./network/Step5Network"
import Step5Disk from "./disk/Step5Disk"
import Step5Memory from "./memory/Step5Memory"
import Step5Hardware from "./hardware/Step5Hardware"
import Step5Process from "./process/step5process.jsx"

export default function Step5({ form, setForm }) {
  if (form.monitorSource === "network")  return <Step5Network  form={form} setForm={setForm} />
  if (form.monitorSource === "disk")     return <Step5Disk     form={form} setForm={setForm} />
  if (form.monitorSource === "memory")   return <Step5Memory   form={form} setForm={setForm} />
  if (form.monitorSource === "hardware") return <Step5Hardware form={form} setForm={setForm} />
  if (form.monitorSource === "process") return <Step5Process form={form} setForm={setForm} />
  return <Step5Cpu form={form} setForm={setForm} />
}
