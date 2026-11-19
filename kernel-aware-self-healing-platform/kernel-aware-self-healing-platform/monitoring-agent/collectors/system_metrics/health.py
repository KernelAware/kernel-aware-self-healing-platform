import os
import re
import platform
import socket
import time
import subprocess
import logging
from datetime import datetime, timedelta

import psutil

logger = logging.getLogger(__name__)


# ---------------------------------------------------------
# CPU TEMPERATURE
# ---------------------------------------------------------

def get_cpu_temperature():
    """
    Returns:
        - Package temperature
        - Per-core temperatures
        - Average temperature
        - Maximum temperature
    """

    try:
        temps = psutil.sensors_temperatures()

        if not temps:
            return {"status": "unavailable"}

        cpu_entries = None

        for sensor_name in ("coretemp", "k10temp", "cpu_thermal"):
            if sensor_name in temps:
                cpu_entries = temps[sensor_name]
                break

        if cpu_entries is None:
            return {"status": "unavailable"}

        package_temperature = None
        core_temperatures = []

        for sensor in cpu_entries:

            label = sensor.label.lower()

            if "package" in label:
                package_temperature = round(sensor.current, 1)

            elif "core" in label:

                try:
                    core_number = int(label.split()[-1]) +1
                except:
                    core_number = len(core_temperatures)

                core_temperatures.append({
                    "core": core_number,
                    "temperature": round(sensor.current, 1)
                })

        values = [c["temperature"] for c in core_temperatures]

        return {

            "timestamp": datetime.now().isoformat(),

            "package_temperature": package_temperature,

            "average_temperature":
                round(sum(values) / len(values), 1)
                if values else None,

            "maximum_temperature":
                max(values) if values else None,

            "cores": sorted(
                core_temperatures,
                key=lambda x: x["core"]
            )
        }

    except Exception as e:
        logger.exception(e)
        return {"status": "error"}

def get_fan_speed():

    try:

        fans = psutil.sensors_fans()

        if not fans:
            return {"status": "unavailable"}

        fan_list = []

        for _, sensors in fans.items():

            fan_number = 1

            for sensor in sensors:

                if sensor.current <= 0:
                    continue

                fan_list.append({
                    "label": f"Fan {fan_number}",
                    "rpm": sensor.current
                })

                fan_number += 1

        return {

            "timestamp": datetime.now().isoformat(),

            "fan_count": len(fan_list),

            "fans": fan_list

        }

    except Exception:

        return {"status": "error"}

def get_battery_status():

    battery = psutil.sensors_battery()

    if battery is None:

        return {

            "status": "no_battery"

        }

    return {

        "percentage": battery.percent,

        "charging": battery.power_plugged,

        "seconds_left": battery.secsleft

    }


def get_smart_status():
    """
    Collect SMART information from physical disks only.
    Supports SATA and NVMe devices.
    """

    try:
        disks = []

        result = subprocess.run(
            ["lsblk", "-d", "-n", "-o", "NAME,TYPE"],
            capture_output=True,
            text=True,
            check=True
        )

        device_names = [
            parts[0]
            for line in result.stdout.splitlines()
            if len(parts := line.split()) == 2
            and parts[1] == "disk"
        ]

        for name in device_names:
            device = f"/dev/{name}"

            try:
                smart = subprocess.run(
                    ["sudo", "-n", "smartctl", "-a", device],
                    capture_output=True,
                    text=True,
                    timeout=15
                )

                output = smart.stdout + "\n" + smart.stderr

                # Health
                if "SMART overall-health self-assessment test result: PASSED" in output:
                    health = "PASSED"
                elif "SMART overall-health self-assessment test result: FAILED" in output:
                    health = "FAILED"
                elif "SMART Health Status: OK" in output:
                    health = "PASSED"
                elif "SMART Health Status: FAILED" in output:
                    health = "FAILED"
                else:
                    health = "UNKNOWN"

                # NVMe health
                if health == "UNKNOWN" and "Critical Warning:" in output:
                    match = re.search(
                        r"Critical Warning:\s*0x([0-9a-fA-F]+)",
                        output
                    )

                    if match:
                        health = (
                            "PASSED"
                            if int(match.group(1), 16) == 0
                            else "WARNING"
                        )

                # Temperature
                temperature = None

                match = re.search(
                    r"Temperature:\s*(\d+)\s+Celsius",
                    output,
                    re.IGNORECASE
                )

                if match:
                    temperature = int(match.group(1))

                else:
                    for line in output.splitlines():
                        if "Temperature_Celsius" in line:
                            match = re.search(
                                r"Temperature_Celsius.*?\s(\d+)\s+\(Min/Max",
                                line
                            )

                            if match:
                                temperature = int(match.group(1))

                            break

                # Power-on hours
                power_on_hours = None

                match = re.search(
                    r"Power On Hours:\s*([\d,]+)",
                    output,
                    re.IGNORECASE
                )

                if match:
                    power_on_hours = int(
                        match.group(1).replace(",", "")
                    )

                else:
                    for line in output.splitlines():
                        if "Power_On_Hours" in line:
                            values = line.split()

                            try:
                                power_on_hours = int(values[-1])
                            except (ValueError, IndexError):
                                pass

                            break

                disks.append({
                    "device": device,
                    "health": health,
                    "temperature": temperature,
                    "power_on_hours": power_on_hours
                })

                logger.info(
                    "SMART %s: health=%s temperature=%s power_on_hours=%s",
                    device,
                    health,
                    temperature,
                    power_on_hours
                )

            except subprocess.TimeoutExpired:
                logger.warning("SMART timeout: %s", device)

            except Exception:
                logger.exception("SMART collection failed for %s", device)

        return {
            "timestamp": datetime.now().isoformat(),
            "disk_count": len(disks),
            "disks": disks
        }

    except Exception:
        logger.exception("SMART collection failed")
        return {"status": "error", "disk_count": 0, "disks": []}


def get_bios_information():

    base = "/sys/class/dmi/id"

    def read(name):

        path = os.path.join(base, name)

        try:

            with open(path) as f:

                return f.read().strip()

        except:

            return None

    return {

        "vendor": read("bios_vendor"),

        "version": read("bios_version"),

        "release_date": read("bios_date")

    }

def get_kernel_information():

    return {

        "kernel": platform.release(),

        "architecture": platform.machine()

    }

def get_host_information():

    base = "/sys/class/dmi/id"

    def read(name):

        try:

            with open(f"{base}/{name}") as f:

                return f.read().strip()

        except:

            return None

    return {

        "hostname": socket.gethostname(),

        "manufacturer": read("sys_vendor"),

        "model": read("product_name")

    }

def get_system_uptime():
    """
    Returns system uptime information.
    """

    try:

        boot_time = psutil.boot_time()

        uptime_seconds = int(time.time() - boot_time)

        uptime = timedelta(seconds=uptime_seconds)

        days = uptime.days
        hours = uptime.seconds // 3600
        minutes = (uptime.seconds % 3600) // 60
        seconds = uptime.seconds % 60

        return {

            "timestamp": datetime.now().isoformat(),

            "boot_time": datetime.fromtimestamp(
                boot_time
            ).isoformat(),

            "uptime_seconds": uptime_seconds,

            "uptime": {
                "days": days,
                "hours": hours,
                "minutes": minutes,
                "seconds": seconds
            },

            "uptime_human":
                f"{days}d {hours}h {minutes}m {seconds}s"

        }

    except Exception as e:
        logger.exception(e)
        return {"status": "error"}

def collect():

    return {

        "timestamp": datetime.now().isoformat(),

        "cpu_temperature": get_cpu_temperature(),

        "fan_speed": get_fan_speed(),

        "battery": get_battery_status(),

        "smart": get_smart_status(),

        "bios": get_bios_information(),

        "kernel": get_kernel_information(),

        "host": get_host_information(),

        "uptime": get_system_uptime()

    }

if __name__ == "__main__":

    from pprint import pprint

    print("=" * 70)
    print("           HARDWARE HEALTH COLLECTOR TEST")
    print("=" * 70)

    print("\n[1] CPU Temperature")
    pprint(get_cpu_temperature())

    print("\n[2] Fan Speed")
    pprint(get_fan_speed())

    print("\n[3] Battery Status")
    pprint(get_battery_status())

    print("\n[4] SMART Status")
    pprint(get_smart_status())

    print("\n[5] BIOS Information")
    pprint(get_bios_information())

    print("\n[6] Kernel Information")
    pprint(get_kernel_information())

    print("\n[7] Host Information")
    pprint(get_host_information())

    print("\n[8] System Uptime")
    pprint(get_system_uptime())

    print("\n[9] Full Hardware Snapshot")
    pprint(collect())

    print("\n" + "=" * 70)
    print("Hardware Health Test Completed")
    print("=" * 70)