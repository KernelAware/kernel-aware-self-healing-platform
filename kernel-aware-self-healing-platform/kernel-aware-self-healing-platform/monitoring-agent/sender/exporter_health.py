from prometheus_client import Gauge, Info


# ---------------- CPU ---------------- #

CPU_PACKAGE_TEMP = Gauge(
    "hardware_cpu_package_temperature_celsius",
    "CPU package temperature"
)

CPU_AVERAGE_TEMP = Gauge(
    "hardware_cpu_average_temperature_celsius",
    "Average CPU core temperature"
)

CPU_MAX_TEMP = Gauge(
    "hardware_cpu_max_temperature_celsius",
    "Maximum CPU core temperature"
)

CPU_CORE_TEMP = Gauge(
    "hardware_cpu_core_temperature_celsius",
    "CPU core temperature",
    ["core"]
)


# ---------------- FAN ---------------- #

FAN_SPEED = Gauge(
    "hardware_fan_speed_rpm",
    "Fan speed",
    ["fan"]
)


# ---------------- BATTERY ---------------- #

BATTERY_PERCENT = Gauge(
    "hardware_battery_percentage",
    "Battery percentage"
)

BATTERY_CHARGING = Gauge(
    "hardware_battery_charging",
    "Battery charging status"
)


# ---------------- SMART ---------------- #

SMART_HEALTH = Gauge(
    "hardware_disk_health",
    "Disk SMART health",
    ["device"]
)

SMART_TEMPERATURE = Gauge(
    "hardware_disk_temperature_celsius",
    "Disk temperature",
    ["device"]
)

SMART_POWER_ON_HOURS = Gauge(
    "hardware_disk_power_on_hours",
    "Disk power-on hours",
    ["device"]
)


# ---------------- UPTIME ---------------- #

SYSTEM_UPTIME = Gauge(
    "hardware_system_uptime_seconds",
    "System uptime"
)


# ---------------- INFO ---------------- #

BIOS_INFO = Info(
    "hardware_bios",
    "BIOS information"
)

HOST_INFO = Info(
    "hardware_host",
    "Host information"
)

KERNEL_INFO = Info(
    "hardware_kernel",
    "Kernel information"
)

from collectors.health import collect


def update_health_metrics():

    data = collect()

    # ---------------- CPU ---------------- #

    cpu = data["cpu_temperature"]

    if cpu.get("package_temperature") is not None:
        CPU_PACKAGE_TEMP.set(cpu["package_temperature"])

    if cpu.get("average_temperature") is not None:
        CPU_AVERAGE_TEMP.set(cpu["average_temperature"])

    if cpu.get("maximum_temperature") is not None:
        CPU_MAX_TEMP.set(cpu["maximum_temperature"])

    for core in cpu.get("cores", []):
        CPU_CORE_TEMP.labels(
            core=str(core["core"])
        ).set(core["temperature"])

    # ---------------- FAN ---------------- #

    fan = data["fan_speed"]

    for index, f in enumerate(fan.get("fans", [])):
        FAN_SPEED.labels(
            fan=f"Fan {index+1}"
        ).set(f["rpm"])

    # ---------------- BATTERY ---------------- #

    battery = data["battery"]

    if battery.get("status") != "no_battery":

        BATTERY_PERCENT.set(
            battery["percentage"]
        )

        BATTERY_CHARGING.set(
            1 if battery["charging"] else 0
        )

    # ---------------- SMART ---------------- #

    smart = data["smart"]

    for disk in smart.get("disks", []):

        SMART_HEALTH.labels(
            device=disk["device"]
        ).set(
            1 if disk["health"] == "PASSED" else 0
        )

        if disk["temperature"] is not None:
            SMART_TEMPERATURE.labels(
                device=disk["device"]
            ).set(disk["temperature"])

        if disk["power_on_hours"] is not None:
            SMART_POWER_ON_HOURS.labels(
                device=disk["device"]
            ).set(disk["power_on_hours"])

    # ---------------- BIOS ---------------- #

    BIOS_INFO.info(data["bios"])

    # ---------------- HOST ---------------- #

    HOST_INFO.info(data["host"])

    # ---------------- KERNEL ---------------- #

    KERNEL_INFO.info(data["kernel"])

    # ---------------- UPTIME ---------------- #

    SYSTEM_UPTIME.set(
        data["uptime"]["uptime_seconds"]
    )

if __name__ == "__main__":

    from load_data.system_metrics.metrics_loader import generate_latest

    print("=" * 70)
    print("      HARDWARE EXPORTER TEST")
    print("=" * 70)

    update_health_metrics()

    print(generate_latest().decode("utf-8"))

    print("=" * 70)
    print("Hardware Exporter Test Completed")
    print("=" * 70)