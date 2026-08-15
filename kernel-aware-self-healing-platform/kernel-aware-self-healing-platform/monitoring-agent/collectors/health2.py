
# import psutil
# import subprocess
# import logging
# import time
# import os
# from datetime import datetime, timedelt
#
# # Setup logging
# logging.basicConfig(
#     level=logging.INFO,
#     format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
# )
# logger = logging.getLogger(__name__)
#
#
# # ─── 1. CPU Temperature ───────────────────────────────────────
#
# def get_cpu_temperature():
#     """
#     Collect CPU temperature readings from Linux hardware sensors.
#     Reads raw data from /sys/class/thermal via psutil.
#
#     coretemp = Intel CPU sensor name
#     k10temp  = AMD CPU sensor name
#     acpitz   = ACPI thermal zone (generic)
#
#     Returns: dict with sensor readings in Celsius
#     """
#     try:
#         temps = psutil.sensors_temperatures()
#
#         if not temps:
#             logger.warning("No temperature sensors found")
#             return {"status": "unavailable", "sensors": []}
#
#         cpu_temps = []
#
#         # Common Linux CPU temperature sensor names
#         sensor_keys = [
#             'coretemp',    # Intel CPUs
#             'k10temp',     # AMD CPUs
#             'cpu_thermal', # ARM CPUs
#             'acpitz'       # ACPI thermal zones
#         ]
#
#         for key in sensor_keys:
#             if key in temps:
#                 for sensor in temps[key]:
#                     cpu_temps.append({
#                         "sensor_name":      sensor.label or key,
#                         "current_celsius":  round(sensor.current, 1),
#                         "high_celsius":     round(sensor.high, 1)
#                                             if sensor.high else None,
#                         "critical_celsius": round(sensor.critical, 1)
#                                             if sensor.critical else None
#                     })
#
#         if not cpu_temps:
#             logger.warning("No CPU temperature sensors found")
#             return {"status": "unavailable", "sensors": []}
#
#         data = {
#             "timestamp":   datetime.now().isoformat(),
#             "sensor_count": len(cpu_temps),
#             "sensors":     cpu_temps,
#             "max_celsius": max(
#                 s["current_celsius"] for s in cpu_temps
#             )
#         }
#
#         logger.info(
#             f"CPU Temperature collected: "
#             f"max={data['max_celsius']}°C"
#         )
#         return data
#
#     except Exception as e:
#         logger.error(f"CPU temperature collection failed: {e}")
#         return {"status": "error", "message": str(e)}
#
#
# # ─── 2. Fan Speed ─────────────────────────────────────────────
#
# def get_fan_speed():
#     """
#     Collect system fan speed readings from Linux hardware sensors.
#     Reads raw data from /sys/class/hwmon via psutil.
#
#     RPM = Rotations Per Minute
#     0 RPM = fan has stopped (possible cooling failure)
#
#     Returns: dict with fan speed readings
#     """
#     try:
#         fans = psutil.sensors_fans()
#
#         if not fans:
#             logger.warning("No fan sensors found")
#             return {"status": "unavailable", "fans": []}
#
#         fan_list = []
#
#         for fan_name, fan_sensors in fans.items():
#             for sensor in fan_sensors:
#                 fan_list.append({
#                     "fan_name":   fan_name,
#                     "label":      sensor.label or fan_name,
#                     "rpm":        sensor.current,
#                     "is_stopped": sensor.current == 0
#                 })
#
#         data = {
#             "timestamp":    datetime.now().isoformat(),
#             "total_fans":   len(fan_list),
#             "stopped_fans": len(
#                 [f for f in fan_list if f["is_stopped"]]
#             ),
#             "fans":         fan_list
#         }
#
#         logger.info(
#             f"Fan Speed collected: "
#             f"{data['total_fans']} fans | "
#             f"{data['stopped_fans']} stopped"
#         )
#         return data
#
#     except Exception as e:
#         logger.error(f"Fan speed collection failed: {e}")
#         return {"status": "error", "message": str(e)}
#
#
# # ─── 3. Battery Status ────────────────────────────────────────
#
# def get_battery_status():
#     """
#     Collect battery status from Linux power management.
#     Reads raw data from /sys/class/power_supply via psutil.
#
#     Only available on laptops.
#     Desktop computers will return no_battery status.
#
#     Returns: dict with battery charge and status
#     """
#     try:
#         battery = psutil.sensors_battery()
#
#         if battery is None:
#             logger.info("No battery detected - desktop system")
#             return {
#                 "status":  "no_battery",
#                 "message": "No battery - desktop system"
#             }
#
#         # Calculate human readable time remaining
#         time_remaining = None
#         if (battery.secsleft != psutil.POWER_TIME_UNLIMITED and
#                 battery.secsleft != psutil.POWER_TIME_UNKNOWN):
#             time_remaining = str(
#                 timedelta(seconds=battery.secsleft)
#             )
#
#         data = {
#             "timestamp":      datetime.now().isoformat(),
#             "percent":        round(battery.percent, 1),
#             "power_plugged":  battery.power_plugged,
#             "charging":       (battery.power_plugged
#                                and battery.percent < 100),
#             "time_remaining": time_remaining,
#             "seconds_left":   battery.secsleft
#         }
#
#         logger.info(
#             f"Battery collected: "
#             f"{data['percent']}% | "
#             f"Plugged: {data['power_plugged']}"
#         )
#         return data
#
#     except Exception as e:
#         logger.error(f"Battery status collection failed: {e}")
#         return {"status": "error", "message": str(e)}
#
#
# # ─── 4. Power Supply Status ───────────────────────────────────
#
# def get_power_supply_status():
#     """
#     Collect power supply status from Linux power management.
#     Reads raw data from /sys/class/power_supply filesystem.
#
#     Checks all power supply devices:
#     AC adapters, USB power, batteries.
#
#     Returns: dict with power supply details
#     """
#     try:
#         power_supplies = []
#         power_path = "/sys/class/power_supply"
#
#         if not os.path.exists(power_path):
#             logger.warning("Power supply path not found")
#             return {
#                 "status":  "unavailable",
#                 "message": "Power supply path not found"
#             }
#
#         for supply in os.listdir(power_path):
#             supply_path = os.path.join(power_path, supply)
#
#             try:
#                 supply_info = {"name": supply}
#
#                 # Read power supply type
#                 type_file = os.path.join(supply_path, "type")
#                 if os.path.exists(type_file):
#                     with open(type_file) as f:
#                         supply_info["type"] = f.read().strip()
#
#                 # Read power supply status
#                 status_file = os.path.join(supply_path, "status")
#                 if os.path.exists(status_file):
#                     with open(status_file) as f:
#                         supply_info["status"] = f.read().strip()
#
#                 # Read online status (AC adapters)
#                 online_file = os.path.join(supply_path, "online")
#                 if os.path.exists(online_file):
#                     with open(online_file) as f:
#                         supply_info["online"] = (
#                             f.read().strip() == "1"
#                         )
#
#                 # Read capacity if available
#                 capacity_file = os.path.join(
#                     supply_path, "capacity"
#                 )
#                 if os.path.exists(capacity_file):
#                     with open(capacity_file) as f:
#                         supply_info["capacity_percent"] = int(
#                             f.read().strip()
#                         )
#
#                 power_supplies.append(supply_info)
#
#             except Exception:
#                 pass
#
#         data = {
#             "timestamp":      datetime.now().isoformat(),
#             "power_supplies": power_supplies,
#             "total_supplies": len(power_supplies)
#         }
#
#         logger.info(
#             f"Power Supply collected: "
#             f"{data['total_supplies']} supplies found"
#         )
#         return data
#
#     except Exception as e:
#         logger.error(f"Power supply collection failed: {e}")
#         return {"status": "error", "message": str(e)}
#
#
# # ─── 5. Disk Health ───────────────────────────────────────────
#
# def get_disk_health():
#     """
#     Collect disk health information from Linux kernel.
#     Reads raw data from /proc/diskstats via psutil.
#
#     Collects per partition:
#     - Total, used, free space in GB
#     - Usage percentage
#     - Filesystem type
#     - I/O read and write counts
#
#     Returns: dict with all disk partition data
#     """
#     try:
#         disk_list = []
#         partitions = psutil.disk_partitions()
#
#         for partition in partitions:
#             try:
#                 usage = psutil.disk_usage(partition.mountpoint)
#                 io    = psutil.disk_io_counters(perdisk=True)
#
#                 # Extract disk name from device path
#                 disk_name = partition.device.split('/')[-1]
#
#                 disk_info = {
#                     "device":         partition.device,
#                     "mountpoint":     partition.mountpoint,
#                     "filesystem":     partition.fstype,
#                     "total_gb":       round(
#                         usage.total / (1024**3), 2
#                     ),
#                     "used_gb":        round(
#                         usage.used / (1024**3), 2
#                     ),
#                     "free_gb":        round(
#                         usage.free / (1024**3), 2
#                     ),
#                     "usage_percent":  usage.percent
#                 }
#
#                 # Add I/O stats if available for this disk
#                 if disk_name in io:
#                     disk_io = io[disk_name]
#                     disk_info["read_count"]  = disk_io.read_count
#                     disk_info["write_count"] = disk_io.write_count
#                     disk_info["read_bytes"]  = disk_io.read_bytes
#                     disk_info["write_bytes"] = disk_io.write_bytes
#
#                 disk_list.append(disk_info)
#
#             except PermissionError:
#                 # Skip partitions we cannot access
#                 pass
#
#         data = {
#             "timestamp":   datetime.now().isoformat(),
#             "total_disks": len(disk_list),
#             "disks":       disk_list
#         }
#
#         logger.info(
#             f"Disk Health collected: "
#             f"{data['total_disks']} partitions"
#         )
#         return data
#
#     except Exception as e:
#         logger.error(f"Disk health collection failed: {e}")
#         return {"status": "error", "message": str(e)}
#
#
# # ─── 6. SMART Status ──────────────────────────────────────────
#
# def get_smart_status():
#     """
#     Collect SMART (Self-Monitoring Analysis and Reporting
#     Technology) data from physical disk drives.
#
#     Reads data using smartctl command line tool.
#     SMART data predicts disk failures before they happen.
#
#     Requires: sudo apt install smartmontools
#
#     Returns: dict with SMART health status per disk
#     """
#     try:
#         smart_results = []
#
#         # Get list of physical block devices
#         result = subprocess.run(
#             ['lsblk', '-d', '-o', 'NAME', '-n'],
#             capture_output=True,
#             text=True
#         )
#
#         disks = result.stdout.strip().split('\n')
#
#         for disk in disks:
#             disk = disk.strip()
#             if not disk:
#                 continue
#
#             disk_path = f"/dev/{disk}"
#
#             try:
#                 # Run smartctl health check
#                 smart_result = subprocess.run(
#                     ['sudo', 'smartctl', '-H', disk_path],
#                     capture_output=True,
#                     text=True,
#                     timeout=10
#                 )
#
#                 output = smart_result.stdout
#
#                 # Parse raw SMART output
#                 if "PASSED" in output:
#                     health = "PASSED"
#                 elif "FAILED" in output:
#                     health = "FAILED"
#                 else:
#                     health = "UNKNOWN"
#
#                 smart_results.append({
#                     "disk":   disk_path,
#                     "health": health
#                 })
#
#             except subprocess.TimeoutExpired:
#                 logger.warning(
#                     f"SMART check timed out for {disk}"
#                 )
#             except Exception as e:
#                 logger.warning(
#                     f"SMART check failed for {disk}: {e}"
#                 )
#
#         data = {
#             "timestamp":    datetime.now().isoformat(),
#             "total_disks":  len(smart_results),
#             "disks":        smart_results
#         }
#
#         logger.info(
#             f"SMART Status collected: "
#             f"{data['total_disks']} disks checked"
#         )
#         return data
#
#     except FileNotFoundError:
#         logger.warning(
#             "smartmontools not installed. "
#             "Run: sudo apt install smartmontools"
#         )
#         return {
#             "status":  "unavailable",
#             "message": "smartmontools not installed"
#         }
#     except Exception as e:
#         logger.error(f"SMART status collection failed: {e}")
#         return {"status": "error", "message": str(e)}
#
#
# # ─── 7. System Uptime ─────────────────────────────────────────
#
# def get_system_uptime():
#     """
#     Collect system uptime from Linux kernel.
#     Reads raw data from /proc/uptime via psutil.
#
#     boot_time        = exact date and time system started
#     uptime_seconds   = total seconds system has been running
#     uptime_human     = readable format (days, hours, minutes)
#
#     Returns: dict with uptime details
#     """
#     try:
#         boot_time     = psutil.boot_time()
#         boot_datetime = datetime.fromtimestamp(boot_time)
#         uptime_seconds = time.time() - boot_time
#         uptime_delta   = timedelta(seconds=int(uptime_seconds))
#
#         days    = uptime_delta.days
#         hours   = uptime_delta.seconds // 3600
#         minutes = (uptime_delta.seconds % 3600) // 60
#
#         data = {
#             "timestamp":       datetime.now().isoformat(),
#             "boot_time":       boot_datetime.isoformat(),
#             "uptime_seconds":  int(uptime_seconds),
#             "uptime_human":    f"{days}d {hours}h {minutes}m",
#             "days":            days,
#             "hours":           hours,
#             "minutes":         minutes
#         }
#
#         logger.info(
#             f"System Uptime collected: "
#             f"{data['uptime_human']}"
#         )
#         return data
#
#     except Exception as e:
#         logger.error(f"System uptime collection failed: {e}")
#         return {"status": "error", "message": str(e)}
#
#
# # ─── 8. Hardware Sensors ──────────────────────────────────────
#
# def get_hardware_sensors():
#     """
#     Collect all available hardware sensor readings from Linux.
#     Reads raw data from /sys/class/hwmon via psutil.
#
#     Collects all:
#     - Temperature sensors (all components)
#     - Fan speed sensors
#     - Voltage sensors (if available)
#
#     Returns: dict with all sensor readings
#     """
#     try:
#         all_sensors = {}
#
#         # Collect all temperature sensors
#         temps = psutil.sensors_temperatures()
#         if temps:
#             all_sensors["temperatures"] = {}
#             for sensor_name, readings in temps.items():
#                 all_sensors["temperatures"][sensor_name] = []
#                 for reading in readings:
#                     all_sensors["temperatures"][
#                         sensor_name
#                     ].append({
#                         "label":            reading.label
#                                             or sensor_name,
#                         "current_celsius":  round(
#                             reading.current, 1
#                         ),
#                         "high_celsius":     round(reading.high, 1)
#                                             if reading.high
#                                             else None,
#                         "critical_celsius": round(
#                             reading.critical, 1
#                         ) if reading.critical else None
#                     })
#
#         # Collect all fan sensors
#         fans = psutil.sensors_fans()
#         if fans:
#             all_sensors["fans"] = {}
#             for fan_name, readings in fans.items():
#                 all_sensors["fans"][fan_name] = []
#                 for reading in readings:
#                     all_sensors["fans"][fan_name].append({
#                         "label": reading.label or fan_name,
#                         "rpm":   reading.current
#                     })
#
#         data = {
#             "timestamp":       datetime.now().isoformat(),
#             "sensors":         all_sensors,
#             "total_temp_sensors": sum(
#                 len(v) for v in
#                 all_sensors.get("temperatures", {}).values()
#             ),
#             "total_fan_sensors": sum(
#                 len(v) for v in
#                 all_sensors.get("fans", {}).values()
#             )
#         }
#
#         logger.info(
#             f"Hardware Sensors collected: "
#             f"{data['total_temp_sensors']} temp sensors | "
#             f"{data['total_fan_sensors']} fan sensors"
#         )
#         return data
#
#     except Exception as e:
#         logger.error(f"Hardware sensors collection failed: {e}")
#         return {"status": "error", "message": str(e)}
#
#
# # ─── 9. collect() ─────────────────────────────────────────────
#
# def collect():
#     """
#     MAIN FUNCTION - called by main.py every 15 seconds.
#
#     Collects ALL raw hardware health get_metrics from Linux kernel
#     and returns them as one complete snapshot.
#
#     This raw data is then forwarded to:
#     → Kafka       (Data Pipeline - stream processing)
#     → Prometheus  (Time Series Storage)
#     → Grafana     (Visualization & Dashboards)
#
#     NO anomaly detection here.
#     NO self-healing triggers here.
#     NO threshold checking here.
#     ONLY raw hardware health data collection.
#
#     Returns: dict
#     """
#     try:
#         logger.info("Starting Hardware Health data collection...")
#
#         data = {
#             "timestamp":       datetime.now().isoformat(),
#             "cpu_temperature": get_cpu_temperature(),
#             "fan_speed":       get_fan_speed(),
#             "battery":         get_battery_status(),
#             "power_supply":    get_power_supply_status(),
#             "disk_health":     get_disk_health(),
#             "smart_status":    get_smart_status(),
#             "system_uptime":   get_system_uptime(),
#             "hardware_sensors":get_hardware_sensors()
#         }
#
#         logger.info(
#             f"Hardware Health collection complete | "
#             f"CPU Temp: "
#             f"{data['cpu_temperature'].get('max_celsius', 'N/A')}°C | "
#             f"Fans: "
#             f"{data['fan_speed'].get('total_fans', 'N/A')} | "
#             f"Uptime: "
#             f"{data['system_uptime'].get('uptime_human', 'N/A')}"
#         )
#
#         return data
#
#     except Exception as e:
#         logger.error(f"Hardware health collection failed: {e}")
#         return {}
#
#
# # ─── Run directly for testing ─────────────────────────────────
#
# if __name__ == "__main__":
#
#     print("=" * 55)
#     print("  DATA COLLECTION LAYER - Hardware Health Test")
#     print("=" * 55)
#
#     print("\n[1] CPU Temperature:")
#     temp = get_cpu_temperature()
#     for s in temp.get("sensors", []):
#         print(
#             f"    {s['sensor_name']}: "
#             f"{s['current_celsius']}°C"
#         )
#
#     print("\n[2] Fan Speed:")
#     fans = get_fan_speed()
#     for f in fans.get("fans", []):
#         print(f"    {f['label']}: {f['rpm']} RPM")
#
#     print("\n[3] Battery Status:")
#     battery = get_battery_status()
#     print(f"    Status  : {battery.get('status', 'N/A')}")
#     print(f"    Percent : {battery.get('percent', 'N/A')}%")
#     print(f"    Plugged : {battery.get('power_plugged', 'N/A')}")
#
#     print("\n[4] Power Supply:")
#     power = get_power_supply_status()
#     for p in power.get("power_supplies", []):
#         print(f"    {p['name']}: {p.get('status', 'N/A')}")
#
#     print("\n[5] Disk Health:")
#     disk = get_disk_health()
#     for d in disk.get("disks", []):
#         print(
#             f"    {d['mountpoint']}: "
#             f"{d['used_gb']}GB / {d['total_gb']}GB "
#             f"({d['usage_percent']}%)"
#         )
#
#     print("\n[6] SMART Status:")
#     smart = get_smart_status()
#     for d in smart.get("disks", []):
#         print(f"    {d['disk']}: {d['health']}")
#
#     print("\n[7] System Uptime:")
#     uptime = get_system_uptime()
#     print(f"    Uptime    : {uptime.get('uptime_human')}")
#     print(f"    Boot Time : {uptime.get('boot_time')}")
#
#     print("\n[8] Hardware Sensors:")
#     sensors = get_hardware_sensors()
#     print(f"    Temp Sensors : {sensors.get('total_temp_sensors')}")
#     print(f"    Fan  Sensors : {sensors.get('total_fan_sensors')}")
#
#     print("\n[9] Full collect() Snapshot:")
#     result = collect()
#     print(f"    Timestamp : {result.get('timestamp')}")
#     print(f"    Keys      : {list(result.keys())}")