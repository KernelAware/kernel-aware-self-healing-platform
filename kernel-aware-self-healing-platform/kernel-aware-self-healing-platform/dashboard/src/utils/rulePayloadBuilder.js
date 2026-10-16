
const OPERATOR_MAP = {
  "Greater Than (>)": "Greater Than (>)",
  "Greater Than or Equal (>=)": "Greater Than or Equal (>=)",
  "Less Than (<)": "Less Than (<)",
  "Less Than or Equal (<=)": "Less Than or Equal (<=)",
  "Equals (=)": "Equals (=)",

  // Support symbolic values as input too
  ">": "Greater Than (>)",
  ">=": "Greater Than or Equal (>=)",
  "<": "Less Than (<)",
  "<=": "Less Than or Equal (<=)",
  "=": "Equals (=)",
};

function normalizeOperator(operator) {
  return OPERATOR_MAP[operator] || operator || "Greater Than (>)";
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
    evaluationFrequency: parseEvaluationFrequency(
      evaluationFrequency
    ),
  };
}

function buildTarget({
  type,
  name,
  metric,
  condition,
}) {
  if (!name) {
    throw new Error(
      "A target name is required before creating this rule."
    );
  }

  if (!metric) {
    throw new Error(
      "A monitoring metric is required before creating this rule."
    );
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


function buildActions(form) {
  const types = Array.isArray(form.actionTypes)
    ? form.actionTypes
    : form.actionType
      ? [form.actionType]
      : [];

  return types;
}


// Memory rule mapper
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
    actions: buildActions(form),
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

// Hardware health rule mapper
function buildHardwarePayload(form) {
  // Preserve existing targets when already populated
  if (
    Array.isArray(form.targets) &&
    form.targets.length > 0
  ) {
    return { ...form };
  }

  const metric =
    form.hardwareMetric ||
    form.condMetric ||
    form.metric;

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
    actions: buildActions(form),
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

// Shared entry point: Memory and Hardware Health only
export function buildRulePayload(form) {
  switch (form.monitorSource) {
    case "memory":
      return buildMemoryPayload(form);

    case "hardware":
      return buildHardwarePayload(form);

    default:
      throw new Error(
        `rulePayloadBuilder does not support: ${form.monitorSource}`
      );
  }
}

