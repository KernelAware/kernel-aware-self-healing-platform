import assert from "node:assert/strict"
import test from "node:test"
import {
  currentRunDiskIncidents,
  isCurrentRunDiskIncident,
  isStaleAnalyticsGeneration,
} from "./activeAlertLifecycle.js"

test("a new run does not hydrate Disk alerts from an older run", () => {
  const previousRun = {
    incident_id: "INC-old",
    monitor_type: "disk",
    analytics_generation: "run-one",
    status: "OPEN",
  }

  assert.deepEqual(currentRunDiskIncidents([previousRun], "run-two"), [])
})

test("delayed WebSocket events from an older run are rejected", () => {
  const delayedEvent = {
    incident_id: "INC-old",
    monitor_type: "disk",
    analytics_generation: "run-one",
  }

  assert.equal(isCurrentRunDiskIncident(delayedEvent, "run-two"), false)
})

test("a delayed readiness message cannot move the Dashboard back to an older run", () => {
  assert.equal(isStaleAnalyticsGeneration("1000000000000000000-old", "2000000000000000000-new"), true)
})

test("current-run Disk alerts hydrate and resolved incidents stay out of the active list", () => {
  const rows = [
    { incident_id: "INC-current", monitor_type: "disk", analytics_generation: "run-two", status: "OPEN" },
    { incident_id: "INC-resolved", monitor_type: "disk", analytics_generation: "run-two", status: "RESOLVED" },
    { incident_id: "INC-process", monitor_type: "process", analytics_generation: "run-two", status: "OPEN" },
  ]

  assert.deepEqual(
    currentRunDiskIncidents(rows, "run-two").map(incident => incident.incident_id),
    ["INC-current"],
  )
})
