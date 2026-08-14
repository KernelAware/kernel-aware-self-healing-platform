import Step4Cpu from "./cpu/Step4Cpu"
import Step4Network from "./network/Step4Network"
import Step4Disk from "./disk/Step4Disk"
import Step4Memory from "./memory/Step4Memory"

export default function Step4({ form, setForm }) {
  if (form.monitorSource === "network") return <Step4Network form={form} setForm={setForm} />
  if (form.monitorSource === "disk")    return <Step4Disk form={form} setForm={setForm} />
  if (form.monitorSource === "memory")  return <Step4Memory form={form} setForm={setForm} />
  return <Step4Cpu form={form} setForm={setForm} />
}
