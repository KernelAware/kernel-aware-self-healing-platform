import Step13 from "../Step13"
import { metricFor } from "./diskHelpers"

export default function Step13Disk({ form, onCancel }) {
  const metric = metricFor(form.condMetric || form.metric)
  const targetName = form.targetType === "Disk / Device" ? form.device : form.mountPoint || form.host
  const reviewForm = {
    ...form,
    targets: form.targets?.length ? form.targets : [{
      type: form.targetType || "Host",
      name: targetName,
      host: form.host,
      metrics: [{
        name: metric.id,
        conditions: [{
          metric: metric.id,
          operator: form.condOperator,
          threshold: form.condThreshold,
          duration: form.condDuration,
          durationUnit: form.condDurationUnit,
        }],
      }],
    }],
    recovery: {
      ...form.recovery,
      required: true,
      metric: [{
        metric: form.recoveryMetric || form.metric,
        operator: form.recoveryOperator,
        threshold: form.recoveryThreshold,
        duration: form.recoveryDuration,
        durationUnit: form.recoveryDurationUnit,
      }],
    },
  }

  return <Step13 form={reviewForm} onCancel={onCancel} />
}
