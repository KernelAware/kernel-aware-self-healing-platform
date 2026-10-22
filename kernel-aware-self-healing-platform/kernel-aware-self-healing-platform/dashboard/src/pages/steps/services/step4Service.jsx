
import { useEffect, useRef, useState } from "react";
import { Panel } from "@/components/kit";
import { getService } from "@/services/api.js";

const METRICS = [
  {
    key: "main_pid",
    label: "Main PID",
    description: "Main process ID of the service",
  },
  {
    key: "cpu_percent",
    label: "CPU Usage (%)",
    description: "CPU usage of the main process",
  },
  {
    key: "memory_percent",
    label: "Memory Usage (%)",
    description: "Percentage of system RAM used by the main process",
  },
  {
    key: "sub_state",
    label: "Sub State",
    description: "Detailed service state, such as running or dead",
  },
  {
    key: "uptime_seconds",
    label: "Uptime",
    description: "Time elapsed since the main process started",
  },
];

function formatUptime(seconds) {
  if (seconds == null || !Number.isFinite(Number(seconds)) || Number(seconds) <= 0) {
    return "N/A";
  }

  const totalSeconds = Math.floor(Number(seconds));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${remainingSeconds}s`;
}

function formatMetricValue(service, metricKey) {
  const value = service[metricKey];

  if (value === undefined || value === null || value === "") {
    return "N/A";
  }

  switch (metricKey) {
    case "main_pid":
      return Number(value) > 0 ? value : "No process";

    case "cpu_percent":
      return `${Number(value).toFixed(2)}%`;

    case "memory_percent":
      return `${Number(value).toFixed(2)}%`;

    case "sub_state":
      return value || "unknown";

    case "uptime_seconds":
      return formatUptime(value);

    default:
      return value;
  }
}

export default function Step4Service({ form, setForm }) {
  const [services, setServices] = useState([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [showServiceList, setShowServiceList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const serviceBoxRef = useRef(null);

  // Load service inventory from the backend.
  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      setLoading(true);
      setErrorMessage("");

      try {
        const data = await getService(form.system_id || 1);

        if (!cancelled) {
          setServices(Array.isArray(data.services) ? data.services : []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load services:", error);
          setServices([]);
          setErrorMessage(
            error.message || "Failed to load services from the backend."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadServices();

    return () => {
      cancelled = true;
    };
  }, [form.system_id]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        serviceBoxRef.current &&
        !serviceBoxRef.current.contains(event.target)
      ) {
        setShowServiceList(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const selectedTargets = Array.isArray(form.targets) ? form.targets : [];

  const selectedServiceTargets = selectedTargets.filter(
    (target) => target.type === "service"
  );

  // Match selected services with the latest backend inventory.
  const selectedServices = selectedServiceTargets.map((target) => {
    const name = target.service_name || target.name;

    return (
      services.find((service) => service.name === name) || {
        name,
        load_state: "unknown",
        active_state: "unknown",
        sub_state: "unknown",
        main_pid: 0,
        cpu_percent: 0,
        memory_percent: 0,
        uptime_seconds: 0,
      }
    );
  });

  // Search services by name.
  const filteredServices = services.filter((service) =>
    (service.name || "")
      .toLowerCase()
      .includes(serviceSearch.trim().toLowerCase())
  );

  // Add or remove a service without changing other target types.
  function handleServiceChange(service) {
    setForm((currentForm) => {
      const targets = Array.isArray(currentForm.targets)
        ? currentForm.targets
        : [];

      const exists = targets.some(
        (target) =>
          target.type === "service" &&
          (target.service_name || target.name) === service.name
      );

      if (exists) {
        return {
          ...currentForm,
          targets: targets.filter(
            (target) =>
              !(
                target.type === "service" &&
                (target.service_name || target.name) === service.name
              )
          ),
        };
      }

      return {
        ...currentForm,
        targets: [
          ...targets,
          {
            type: "service",
            name: service.name,
            service_name: service.name,
            metrics: [],
          },
        ],
      };
    });
  }

  // Toggle a monitoring metric for a selected service.
  function handleMetricChange(serviceName, metricKey) {
    setForm((currentForm) => {
      const targets = Array.isArray(currentForm.targets)
        ? currentForm.targets
        : [];

      return {
        ...currentForm,
        targets: targets.map((target) => {
          if (
            target.type !== "service" ||
            (target.service_name || target.name) !== serviceName
          ) {
            return target;
          }

          const metrics = Array.isArray(target.metrics)
            ? target.metrics
            : [];

          const alreadySelected = metrics.includes(metricKey);

          return {
            ...target,
            metrics: alreadySelected
              ? metrics.filter((metric) => metric !== metricKey)
              : [...metrics, metricKey],
          };
        }),
      };
    });
  }

  return (
    <Panel className="p-6">
      {/* Header */}
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
          4. Target &amp; Metric
        </p>

        <p className="mt-0.5 text-xs text-muted-foreground">
          Select systemd services and choose the metrics to monitor.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Service selection */}
          <div>
            <label className="mb-1.5 block font-mono text-[11px] text-foreground">
              Target Services <span className="text-destructive">*</span>
            </label>

            <div ref={serviceBoxRef} className="relative">
              <input
                type="text"
                value={serviceSearch}
                onChange={(event) => {
                  setServiceSearch(event.target.value);
                  setShowServiceList(true);
                }}
                onFocus={() => setShowServiceList(true)}
                placeholder="Type to search services..."
                className="w-full rounded-md border bg-background px-3 py-2 font-mono text-[11px] text-foreground outline-none focus:border-primary/50"
              />

              {showServiceList && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-[220px] overflow-y-auto rounded-md border bg-background shadow-lg">
                  {loading ? (
                    <p className="px-3 py-3 font-mono text-[11px] text-muted-foreground">
                      Loading services...
                    </p>
                  ) : errorMessage ? (
                    <p className="px-3 py-3 font-mono text-[11px] text-destructive">
                      {errorMessage}
                    </p>
                  ) : filteredServices.length === 0 ? (
                    <p className="px-3 py-3 font-mono text-[11px] text-muted-foreground">
                      No matching services.
                    </p>
                  ) : (
                    filteredServices.map((service) => {
                      const selected = selectedServiceTargets.some(
                        (target) =>
                          (target.service_name || target.name) === service.name
                      );

                      return (
                        <button
                          key={service.name}
                          type="button"
                          onClick={() => {
                            handleServiceChange(service);
                            setServiceSearch("");
                          }}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left font-mono text-[11px] transition ${
                            selected
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          <div>
                            <span className="font-bold">{service.name}</span>

                            <span className="ml-2 text-muted-foreground">
                              {service.active_state || "unknown"}
                            </span>

                            {service.recommended && (
                              <span className="ml-2 text-green-500">
                                Recommended
                              </span>
                            )}
                          </div>

                          {selected && (
                            <span className="font-bold text-primary">✓</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Selected service tags */}
            {selectedServiceTargets.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedServiceTargets.map((target) => {
                  const name = target.service_name || target.name;

                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleServiceChange({ name })}
                      className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 font-mono text-[10px] text-primary hover:bg-primary/20"
                    >
                      <span>{name}</span>
                      <span>×</span>
                    </button>
                  );
                })}
              </div>
            )}

            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              Search by service name, such as ssh.service or cron.service.
            </p>
          </div>

          {/* Selected services and metrics */}
          <div className="max-h-[550px] overflow-y-auto rounded-md border border-primary/20 bg-primary/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                Selected Services
              </p>

              <span className="font-mono text-[10px] text-muted-foreground">
                {selectedServiceTargets.length} selected
              </span>
            </div>

            {selectedServices.length === 0 ? (
              <p className="font-mono text-[11px] text-muted-foreground">
                No services selected.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedServices.map((service) => {
                  const name = service.name;

                  const target = selectedServiceTargets.find(
                    (item) =>
                      (item.service_name || item.name) === name
                  );

                  const selectedMetrics = Array.isArray(target?.metrics)
                    ? target.metrics
                    : [];

                  return (
                    <div
                      key={name}
                      className="rounded-md border border-primary/10 bg-background/50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="break-all font-mono text-[12px] font-bold text-foreground">
                          {name}
                        </p>

                        <button
                          type="button"
                          onClick={() => handleServiceChange(service)}
                          className="shrink-0 text-[10px] text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      </div>

                      {/* Service state */}
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            Load State
                          </p>
                          <p className="font-mono text-[11px] text-foreground">
                            {service.load_state || "unknown"}
                          </p>
                        </div>

                        <div>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            Active State
                          </p>
                          <p className="font-mono text-[11px] text-foreground">
                            {service.active_state || "unknown"}
                          </p>
                        </div>

                        <div>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            Sub State
                          </p>
                          <p className="font-mono text-[11px] text-foreground">
                            {service.sub_state || "unknown"}
                          </p>
                        </div>
                      </div>

                      {/* Main PID, CPU, memory and uptime */}
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded border p-2">
                          <p className="font-mono text-[10px] text-muted-foreground">
                            Main PID
                          </p>
                          <p className="mt-1 break-all font-mono text-[11px] text-foreground">
                            {formatMetricValue(service, "main_pid")}
                          </p>
                        </div>

                        <div className="rounded border p-2">
                          <p className="font-mono text-[10px] text-muted-foreground">
                            CPU Usage
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-foreground">
                            {formatMetricValue(service, "cpu_percent")}
                          </p>
                        </div>

                        <div className="rounded border p-2">
                          <p className="font-mono text-[10px] text-muted-foreground">
                            Memory Usage
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-foreground">
                            {formatMetricValue(service, "memory_percent")}
                          </p>
                        </div>

                        <div className="rounded border p-2">
                          <p className="font-mono text-[10px] text-muted-foreground">
                            Uptime
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-foreground">
                            {formatMetricValue(service, "uptime_seconds")}
                          </p>
                        </div>
                      </div>

                      {/* Metric selection */}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Information panel */}
        <div className="lg:col-span-1">
          <div className="h-full rounded-md border border-primary/20 bg-primary/5 p-4">
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
              Service Monitoring Policies
            </p>

            <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
              Monitor systemd services, detect inactive or failed services,
              evaluate configured policies, and initiate appropriate recovery
              actions.
            </p>

            <div className="mt-4 space-y-3">
              {METRICS.map((metric) => (
                <div key={metric.key}>
                  <p className="font-mono text-[10px] font-bold text-foreground">
                    {metric.label}
                  </p>
                  <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                    {metric.description}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-4 font-mono text-[10px] leading-relaxed text-muted-foreground">
              Metric selections are stored in each service target. Ensure your
              backend rule evaluator supports these metric keys.
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
