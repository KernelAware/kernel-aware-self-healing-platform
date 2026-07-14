import psutil  #a Python library that lets your program ask the operating system for system information.
import time
import logging #This library records messages about what the program is doing.
import socket   #This library deals with networking and machine identity.
from datetime import datetime   #This library works with dates and times.


## Logging Configuration

logging.basicConfig(
    #filename="app.txt",    #to store logs in a txt file, witout this default is the terminal
    level=logging.INFO,    #Record messages that are INFO level or more important   Python records INFO WARNING ERROR CRITICAL but ignores DEBUG
    format="%(asctime)s | %(levelname)s | %(message)s"  #use ths format for the log messages
    #Current Date and Time | Log Level | Message
)
logger = logging.getLogger(__name__)  #creates a logger object for the current Python file


## Threshold Configuration

# Disk Usage Thresholds
DISK_WARNING_THRESHOLD = 80.0
DISK_CRITICAL_THRESHOLD = 90.0

# Throughput Thresholds - Bytes per second
READ_SPEED_WARNING = 100 * 1024 * 1024     
WRITE_SPEED_WARNING = 100 * 1024 * 1024

# Disk Input/Output Operations Per Second Threshold
IOPS_WARNING = 5000

# Low free space threshold - Less than 10% free space is considered low
LOW_FREE_SPACE_PERCENT = 10


## Internal Variables

# These variables are used to calculate throughput and IOPS.
# They store the previous snapshot so we can compare it with the current one and do calculations.
# throughput - How much data is transferred in a certain amount of time.

#code uses values based on bytes transferred.
_previous_throughput_io = None  #stores the previous disk I/O counters.
_previous_throughput_time = None    #stores the time when the previous I/O measurement was taken.

#code uses values based on the number of read/write operations completed.
_previous_iops_io = None    #stores the previous disk I/O counters.
_previous_iops_time = None   #stores the time when the previous IOPS measurement was taken.

#Both variables throughput_io and iops_io store the same type of data, The difference is how they use it.
#separated them for just code clarity and future flexibility.


#Convert bytes into gigabytes
def bytes_to_gb(value):
    return round(value / (1024 ** 3), 2)


#Collect usage statistics for every mounted disk partition.
"""
    Returns
        {
            "device": "/dev/sda2",
            "mountpoint": "/",
            "filesystem": "ext4",
            "total_gb": 512,
            "used_gb": 301,
            "free_gb": 211,
            "usage_percent": 58
        }
    for all partitions
"""
def get_disk_usage():
    disks = []  #an empty list that will eventually store the information of all detected disk partitions
    try:
        partitions = psutil.disk_partitions(all=False)  #returns all real mounted disk partition objects 
        for partition in partitions:    #loops through every partition.
            try:
                usage = psutil.disk_usage(partition.mountpoint) #returns a object that shows the usage on this partition
                # create a dictionary called disk
                disk = {
                    "device": partition.device, #device attribute of partiton object
                    "mountpoint": partition.mountpoint,
                    "filesystem": partition.fstype,
                    "total_bytes": usage.total,
                    "used_bytes": usage.used,   #used attribute of the usage object
                    "free_bytes": usage.free,
                    "total_gb": bytes_to_gb(usage.total),
                    "used_gb": bytes_to_gb(usage.used),
                    "free_gb": bytes_to_gb(usage.free),
                    "usage_percent": usage.percent
                }   
                disks.append(disk) #Take the dictionary named disk and add it to the end of the disks list.
                logger.info(
                    f"{partition.mountpoint} "  # (f)formatted string - allows you to insert variables directly into a string.
                    f"Usage : {usage.percent}%"
                )

            except PermissionError: #if the failier is a permission error
                logger.warning(
                    f"Permission denied : "
                    f"{partition.mountpoint}"
                )

            except Exception as e:  #if the failure is an exception
                logger.error(
                    f"Error reading "
                    f"{partition.mountpoint} : {e}" # store the exception error in e and log it
                )
        return disks
    
    except Exception as e:  #if the wholw function failed
        logger.error(
            f"Disk usage collection failed : {e}"
        )
        return []   #return an empty list


# Return information about all mounted disk partitions on the Linux system
"""
    Returns
    [
        {
            "device": "/dev/sda1",
            "mountpoint": "/",
            "filesystem": "ext4",
            "options": "rw,relatime"
        }
    ]
    for all disk partitions
"""
def get_mounted_partitions():
    result = []
    try:
        partitions = psutil.disk_partitions(all=False)
        for partition in partitions:
            result.append({
                "device": partition.device,
                "mountpoint": partition.mountpoint,
                "filesystem": partition.fstype,
                "options": partition.opts
            })
        logger.info(
            f"{len(result)} mounted partitions found."
        )
        return result
    
    except Exception as e:
        logger.error(
            f"Partition collection failed : {e}"
        )
        return []   # if fails return empty list


# collects system-wide disk I/O statistics and return total I/O statistics
"""
    Returns
    {
        "read_bytes": 123456789,
        "write_bytes": 987654321,
        "read_count": 4567,
        "write_count": 3210,
        "read_time_ms": 1500,
        "write_time_ms": 2100,
        "busy_time_ms": 3200
    }
"""
def get_disk_io_counters():
    try:
        io = psutil.disk_io_counters()  # returns cumulative I/O statistics object
        if io is None:
            return {}
        return {
            "read_bytes": io.read_bytes,
            "write_bytes": io.write_bytes,
            "read_count": io.read_count,
            "write_count": io.write_count,
            "read_time_ms": getattr(io, "read_time", 0),
            "write_time_ms": getattr(io, "write_time", 0),
            "busy_time_ms": getattr(io, "busy_time", 0)
        }
        #getattr : If the attribute exists, return its value.
        #If the attribute doesn't exist, return the default_value instead.
    
    except Exception as e:
        logger.error(
            f"Total Disk IO collection failed : {e}"
        )
        return {}   # if fails return empty list
    

# detailed IO metrics for each individual disk
"""
    Returns
        {
            "nvme0n1": {
                "read_bytes": 4000000000,
                "write_bytes": 2000000000,
                ...
            },
            "sda": {
                "read_bytes": 6000000000,
                "write_bytes": 3000000000,
                ...
            }
        }
    For all disks
"""
def get_disk_io_counters_per_disk():
    try:
        disk_io = psutil.disk_io_counters(perdisk=True)
        #returns Key value pairs
        #key : disk name, Value : object containing the statistics for that disk.
        if not disk_io:
            return {}
        result = {}
        for disk_name, io in disk_io.items():   # Disk name , Object
            result[disk_name] = {
                "read_bytes": io.read_bytes,
                "write_bytes": io.write_bytes,
                "read_count": io.read_count,
                "write_count": io.write_count,
                "read_time_ms": getattr(io, "read_time", 0),
                "write_time_ms": getattr(io, "write_time", 0),
                "busy_time_ms": getattr(io, "busy_time", 0)
            }
        return result

    except Exception as e:
        logger.error(f"Per-disk IO collection failed: {e}")
        return {}
    

# Disk Throughput

def get_disk_throughput():
    global _previous_throughput_io
    global _previous_throughput_time
    try:
        current = psutil.disk_io_counters()
        current_time = time.time()
        if current is None:
            return {}
        
        # First sample
        if _previous_throughput_io is None:
            _previous_throughput_io = current
            _previous_throughput_time = current_time
            return {
                "read_speed_bps": 0,
                "write_speed_bps": 0,
                "read_speed_mb": 0,
                "write_speed_mb": 0
            }
        
        elapsed = current_time - _previous_throughput_time
        read_speed = (
            current.read_bytes -
            _previous_throughput_io.read_bytes
        ) / elapsed
        write_speed = (
            current.write_bytes -
            _previous_throughput_io.write_bytes
        ) / elapsed
        _previous_throughput_io = current
        _previous_throughput_time = current_time
        return {
            "read_speed_bps": round(read_speed, 2),
            "write_speed_bps": round(write_speed, 2),
            "read_speed_mb": round(read_speed / (1024 * 1024), 2),
            "write_speed_mb": round(write_speed / (1024 * 1024), 2)
        }
    
    except Exception as e:
        logger.error(
            f"Disk throughput calculation failed : {e}"
        )
        return {}


# Disk IOPS

def get_disk_iops():
    global _previous_iops_io
    global _previous_iops_time
    try:
        current = psutil.disk_io_counters()
        current_time = time.time()
        if current is None:
            return {}
        if _previous_iops_io is None:
            _previous_iops_io = current
            _previous_iops_time = current_time
            return {
                "read_iops": 0,
                "write_iops": 0,
                "total_iops": 0
            }

        elapsed = current_time - _previous_iops_time
        read_iops = (
            current.read_count -
            _previous_iops_io.read_count
        ) / elapsed
        write_iops = (
            current.write_count -
            _previous_iops_io.write_count
        ) / elapsed
        total = read_iops + write_iops
        _previous_iops_io = current
        _previous_iops_time = current_time
        return {
            "read_iops": round(read_iops, 2),
            "write_iops": round(write_iops, 2),
            "total_iops": round(total, 2)
        }

    except Exception as e:
        logger.error(
            f"IOPS calculation failed : {e}"
        )
        return {}



# Disk Latency

def get_disk_latency():
    try:
        io = psutil.disk_io_counters()
        if io is None:
            return {}

        read_latency = 0
        if io.read_count > 0:
            read_latency = (
                io.read_time /
                io.read_count
            )
        write_latency = 0
        if io.write_count > 0:
            write_latency = (
                io.write_time /
                io.write_count
            )
        return {
            "read_latency_ms":
                round(read_latency, 4),
            "write_latency_ms":
                round(write_latency, 4)
        }

    except Exception as e:
        logger.error(
            f"Disk latency calculation failed : {e}"
        )
        return {}


# Disk Busy Time

def get_disk_busy_percentage():
    try:
        io = psutil.disk_io_counters()
        return {
            "busy_time_ms":
                getattr(io, "busy_time", 0)
        }

    except Exception as e:
        logger.error(
            f"Busy time collection failed : {e}"
        )
        return {}


# 8. Busiest Partition

def get_busiest_partition():
    try:
        usage = get_disk_usage()
        if len(usage) == 0:
            return {}

        busiest = max(
            usage,
            key=lambda x:
                x["usage_percent"]
        )
        return busiest

    except Exception as e:
        logger.error(
            f"Busiest partition detection failed : {e}"
        )
        return {}


# Low Free Space Detection

def get_low_free_space_partitions(threshold=LOW_FREE_SPACE_PERCENT):
    results = []
    try:
        disks = get_disk_usage()
        for disk in disks:
            free_percent = ( disk["free_bytes"] / disk["total_bytes"] ) * 100
            if free_percent <= threshold:
                results.append({
                    "device":
                        disk["device"],
                    "mountpoint":
                        disk["mountpoint"],
                    "free_percent":
                        round(
                            free_percent,
                            2
                        )
                })
        return results

    except Exception as e:
        logger.error(
            f"Low free space detection failed : {e}"
        )
        return []
    

# Complete Disk Snapshot

def get_disk_stats_snapshot():
    usage = get_disk_usage()
    snapshot = {
        "timestamp":
            datetime.now().isoformat(),
        "hostname":
            socket.gethostname(),
        "disk_usage":
            usage,
        "mounted_partitions":
            get_mounted_partitions(),
        "io_counters":
            get_disk_io_counters(),
        "per_disk_io_counters": 
            get_disk_io_counters_per_disk(),
        "throughput":
            get_disk_throughput(),
        "iops":
            get_disk_iops(),
        "latency":
            get_disk_latency(),
        "busy_time":
            get_disk_busy_percentage(),
        "busiest_partition":
            get_busiest_partition(),
        "low_free_space":
            get_low_free_space_partitions()
    }

    return snapshot


# Continuous Disk Monitoring

def monitor_disk_continuously(interval=15, callback=None):
    logger.info(
        f"Disk monitoring started "
        f"(every {interval} seconds)"
    )
    while True:
        try:
            snapshot = get_disk_stats_snapshot()
            anomaly = snapshot["anomaly"]
            if anomaly["severity"] == "CRITICAL":
                logger.critical(
                    "CRITICAL DISK ANOMALY DETECTED"
                )
                if callback:
                    callback(snapshot)
            elif anomaly["severity"] == "WARNING":
                logger.warning("Disk warning detected.")
            else:
                logger.info("Disk healthy.")
            time.sleep(interval)

        except KeyboardInterrupt:
            logger.info("Disk monitoring stopped.")
            break

        except Exception as e:
            logger.error( f"Monitoring failed : {e}")
            time.sleep(interval)


# Testing

if __name__ == "__main__":
    print(" Disk Monitoring Test")
    snapshot = get_disk_stats_snapshot()
    print("Timestamp")
    print(snapshot["timestamp"])
    print("\nHostname")
    print(snapshot["hostname"])
    print("\nDisk Usage")
    for disk in snapshot["disk_usage"]:
        print(
            f"{disk['mountpoint']} "
            f"{disk['usage_percent']}%"
        )
    print("\nThroughput")
    print(snapshot["throughput"])
    print("\nIOPS")
    print(snapshot["iops"])
    print("\nLatency")
    print(snapshot["latency"])
    print("\nDisk Health")
    for health in snapshot["health"]:
        print(
            health["mountpoint"],
            health["status"]
        )
    print("\nLow Free Space")
    print(snapshot["low_free_space"])
    print("\nAnomaly")
    print(snapshot["anomaly"])
