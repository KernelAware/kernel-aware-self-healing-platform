
const OPERATOR_MAP = {
  "Greater Than (>)": ">",
  "Less Than (<)": "<",
  "Equals (=)": "=",
};

function normalizeOperator(operator) {
  return OPERATOR_MAP[operator] || operator || ">";
}

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseEvaluationFrequency(value) {
  const match = String(value || "").match(
    /Every\s+(\d+)\s+(second|seconds|minute|minutes|hour|hours)/i
  );

  if (!match) return 30;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (unit.startsWith("hour")) return amount * 3600;
  if (unit.startsWith("minute")) return amount * 60;

  return amount;
}

function buildCondition({
  metric,
  operator,
  threshold,
  duration,
  durationUnit,
  evaluationFrequency,
}) {
  return {
    metric,
    operator: normalizeOperator(operator),
    threshold: toNumberOrNull(threshold),
    duration: toNumberOrNull(duration) ?? 0,
    durationUnit: durationUnit || "Minutes",
    evaluationFrequency: parseEvaluationFrequency(evaluationFrequency),
  };
}

function buildTarget({
  type,
  name,
  metric,
  condition,
}) {
  if (!name) {
    throw new Error("A target name is required before creating this rule.");
  }

  if (!metric) {
    throw new Error("A monitoring metric is required before creating this rule.");
  }

  return {
    type,
    name,
    metrics: [
      {
        name: metric,
        conditions: [condition],
      },
    ],
  };
}

// Memory mapper
function buildMemoryPayload(form) {
  const metric = form.memoryMetric || form.metric;

  const condition = buildCondition({
    metric,
    operator: form.condOperator,
    threshold: form.condThreshold,
    duration: form.condDuration,
    durationUnit: form.condDurationUnit,
    evaluationFrequency: form.condInterval,
  });

  return {
    ...form,
    targets: [
      buildTarget({
        type: form.targetType || "Host",
        name: form.host,
        metric,
        condition,
      }),
    ],
  };
}

// CPU mapper
function buildCpuPayload(form) {
  // Keep existing CPU targets if the CPU wizard already creates them.
  if (Array.isArray(form.targets) && form.targets.length > 0) {
    return { ...form };
  }

  const metric = form.condMetric || form.metric;

  const condition = buildCondition({
    metric,
    operator: form.condOperator,
    threshold: form.condThreshold,
    duration: form.condDuration,
    durationUnit: form.condDurationUnit,
    evaluationFrequency: form.condInterval,
  });

  return {
    ...form,
    targets: [
      buildTarget({
        type: form.targetType || "Host",
        name: form.host,
        metric,
        condition,
      }),
    ],
  };
}

// Disk mapper
function buildDiskPayload(form) {
  if (Array.isArray(form.targets) && form.targets.length > 0) {
    return { ...form };
  }

  const metric = form.diskMetric || form.condMetric || form.metric;
  const targetName = form.mountPoint || form.host;

  const condition = buildCondition({
    metric,
    operator: form.condOperator,
    threshold: form.condThreshold,
    duration: form.condDuration,
    durationUnit: form.condDurationUnit,
    evaluationFrequency: form.condInterval,
  });

  return {
    ...form,
    targets: [
      buildTarget({
        type: form.targetType || "Partition",
        name: targetName,
        metric,
        condition,
      }),
    ],
  };
}

// Network mapper
function buildNetworkPayload(form) {
  if (Array.isArray(form.targets) && form.targets.length > 0) {
    return { ...form };
  }

  const metric = form.networkMetric || form.condMetric || form.metric;

  const condition = buildCondition({
    metric,
    operator: form.condOperator,
    threshold: form.condThreshold,
    duration: form.condDuration,
    durationUnit: form.condDurationUnit,
    evaluationFrequency: form.condInterval,
  });

  return {
    ...form,
    targets: [
      buildTarget({
        type: form.targetType || "Network Interface",
        name: form.host,
        metric,
        condition,
      }),
    ],
  };
}

// Hardware mapper
function buildHardwarePayload(form) {
  if (Array.isArray(form.targets) && form.targets.length > 0) {
    return { ...form };
  }

  const metric = form.hardwareMetric || form.condMetric || form.metric;

  const condition = buildCondition({
    metric,
    operator: form.condOperator,
    threshold: form.condThreshold,
    duration: form.condDuration,
    durationUnit: form.condDurationUnit,
    evaluationFrequency: form.condInterval,
  });

  return {
    ...form,
    targets: [
      buildTarget({
        type: form.targetType || "Host",
        name: form.host,
        metric,
        condition,
      }),
    ],
  };
}

// Process mapper
function buildProcessPayload(form) {
  // Preserve the process team's existing nested target configuration.
  if (!Array.isArray(form.targets) || form.targets.length === 0) {
    throw new Error(
      "Process rules require the process target configuration."
    );
  }

  return { ...form };
}

// Shared entry point
export function buildRulePayload(form) {
  switch (form.monitorSource) {
    case "memory":
      return buildMemoryPayload(form);

    case "cpu":
      return buildCpuPayload(form);

    case "disk":
      return buildDiskPayload(form);

    case "network":
      return buildNetworkPayload(form);

    case "hardware":
      return buildHardwarePayload(form);

    case "process":
      return buildProcessPayload(form);

    default:
      throw new Error(
        `Unsupported monitor source: ${form.monitorSource}`
      );
  }
}