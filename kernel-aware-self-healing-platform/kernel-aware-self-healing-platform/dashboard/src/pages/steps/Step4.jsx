import Step4Cpu from "./cpu/Step4Cpu"
import Step4Network from "./network/Step4Network"

export default function Step4({ form, setForm }) {
  if (form.monitorSource === "network") {
    return <Step4Network form={form} setForm={setForm} />
  }
  return <Step4Cpu form={form} setForm={setForm} />
}
