import Step5Cpu from "./cpu/Step5Cpu"
import Step5Network from "./network/Step5Network"

export default function Step5({ form, setForm }) {
  if (form.monitorSource === "network") {
    return <Step5Network form={form} setForm={setForm} />
  }
  return <Step5Cpu form={form} setForm={setForm} />
}
