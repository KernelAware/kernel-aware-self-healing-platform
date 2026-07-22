import json
import psutil  #a Python library that lets your program ask the operating system for system information.
import time
import logging #This library records messages about what the program is doing.
import socket   #This library deals with networking and machine identity.
from datetime import datetime   #This library works with dates and times.

from pathlib import Path


## Logging Configuration
BASE_DIR = Path(__file__).resolve().parent

logging.basicConfig(
    #filename= BASE_DIR / "disk_log.txt",    #to store logs in a txt file, witout this default is the terminal
    level=logging.INFO,    #Record messages that are INFO level or more important   Python records INFO WARNING ERROR CRITICAL but ignores DEBUG
    format="%(asctime)s | %(levelname)s | %(message)s"  #use ths format for the log messages
    #Current Date and Time | Log Level | Message
)
logger = logging.getLogger(__name__)  #creates a logger object for the current Python file

## Internal Variables

# These variables are used to calculate throughput and IOPS.
# They store the previous snapshot so we can compare it with the current one and do calculations.
# throughput - How much data is transferred in a certain amount of time.

# Throughput
_previous_throughput_io = None
_previous_throughput_time = None

# IOPS
_previous_iops_io = None
_previous_iops_time = None

# Busy Time
_previous_busy_io = None
_previous_busy_time = None

# Per-disk Throughput
_previous_per_disk_io = {}
_previous_per_disk_time = {}

# Per-disk IOPS
_previous_per_disk_iops_io = {}
_previous_per_disk_iops_time = {}

# Per-disk Latency
_previous_per_disk_latency_io = {}
_previous_per_disk_latency_time = {}

# Per-disk Busy Time
_previous_per_disk_busy_io = {}
_previous_per_disk_busy_time = {}

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
    

# Overall system disk throughput
# calculates the combined throughput of all disks in the system.
"""
    Returns 
    {
        "read_speed_bps": 0,
        "write_speed_bps": 0,
        "read_speed_mb": 0,
        "write_speed_mb": 0
    }

    Total Read Speed
    =
    Read speed of Disk A
    +
    Read speed of Disk B
    +
    Read speed of Disk C
"""
def get_disk_throughput():              # These global variables store:
    global _previous_throughput_io              # the previous disk I/O counters obj
    global _previous_throughput_time            # the time they were collected
                                        
    try:
        current = psutil.disk_io_counters()     # collect current IO counters obj
        current_time = time.time()              # Get current time
        if current is None:
            return {}
        
        # First sample
        if _previous_throughput_io is None:     # if this is the first sample
            _previous_throughput_io = current   # Current disk I/O counters obj
            _previous_throughput_time = current_time    # Current Time
            return {
                "read_speed_bps": 0,
                "write_speed_bps": 0,
                "read_speed_mb": 0,
                "write_speed_mb": 0
            }
        
        elapsed = current_time - _previous_throughput_time      # Time Gap
        read_speed = (
            current.read_bytes -        # current.read_bytes  this keeps building
            _previous_throughput_io.read_bytes
        ) / elapsed
        write_speed = (
            current.write_bytes -
            _previous_throughput_io.write_bytes
        ) / elapsed
        _previous_throughput_io = current           # Exchange
        _previous_throughput_time = current_time
        return {
            "read_speed_bps": round(read_speed, 2),     #Round the value to 2 decimal places.
            "write_speed_bps": round(write_speed, 2),
            "read_speed_mb": round(read_speed / (1024 * 1024), 2),
            "write_speed_mb": round(write_speed / (1024 * 1024), 2)
        }
    
    except Exception as e:
        logger.error(
            f"Disk throughput calculation failed : {e}"
        )
        return {}
# Should called at least twise


# calculate throughput for each disk separately.
# The first time a disk is encountered, it saves that disk's counters and timestamp, 
        #returns a throughput of 0, and moves to the next disk.
# On subsequent calls, the disk already has a previous snapshot, so the function can calculate the actual 
        # read and write throughput by comparing the new counters with the stored ones.
"""
    Returns
        {
            "nvme0n1": {
                "read_speed_mb": 120.5,
                "write_speed_mb": 80.3
            },

            "sda": {
                "read_speed_mb": 32.4,
                "write_speed_mb": 18.9
            },

            "sdb": {
                "read_speed_mb": 5.2,
                "write_speed_mb": 0.0
            }
        }
"""
def get_disk_throughput_per_disk():
    global _previous_per_disk_io
    global _previous_per_disk_time

    try:
        current_io = psutil.disk_io_counters(perdisk=True)
        #returns Key value pairs
        #key : disk name, Value : object containing the statistics for that disk.
        current_time = time.time()
        if not current_io:
            return {}
        
        result = {}
        for disk_name, io in current_io.items():    # Disk name , Object

            # First sample for this disk
            if disk_name not in _previous_per_disk_io:      # first disk not in {}(initially _previous_per_disk_io is empty)
                _previous_per_disk_io[disk_name] = io
                _previous_per_disk_time[disk_name] = current_time
                result[disk_name] = {
                    "read_speed_bps": 0,
                    "write_speed_bps": 0,
                    "read_speed_mb": 0,
                    "write_speed_mb": 0
                }
                continue

            elapsed = (
                current_time -
                _previous_per_disk_time[disk_name]
            )

            if elapsed <= 0:
                continue

            read_speed = (
                io.read_bytes -
                _previous_per_disk_io[disk_name].read_bytes
            ) / elapsed
            write_speed = (
                io.write_bytes -
                _previous_per_disk_io[disk_name].write_bytes
            ) / elapsed
            result[disk_name] = {
                "read_speed_bps": round(read_speed, 2),
                "write_speed_bps": round(write_speed, 2),
                "read_speed_mb": round(read_speed / (1024 * 1024), 2),
                "write_speed_mb": round(write_speed / (1024 * 1024), 2)
            }
            _previous_per_disk_io[disk_name] = io
            _previous_per_disk_time[disk_name] = current_time
        return result

    except Exception as e:
        logger.error(
            f"Per-disk throughput calculation failed: {e}"
        )
        return {}
# Should called at least twise


# Disk IOPS
# returns the combined counters of all disks.
"""
    Read IOPS  = 300 + 100 = 400
    Write IOPS = 150 + 50 = 200
    Total IOPS = 600

    Returns 
    {
        "read_iops": 400,
        "write_iops": 200,
        "total_iops": 600
    }
"""
def get_disk_iops():
    global _previous_iops_io        # previous disk counters
    global _previous_iops_time      # previous timestamp
    try:
        current = psutil.disk_io_counters()     # cumulative IO Counters since boot.
        current_time = time.time()
        if current is None:     # if the read is unsuccesfull
            return {}
        
        #if this is the First call
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

        _previous_iops_io = current         # Exchange
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
# Should called at least twise


# Returns IOPS for each disk separately
"""
    Returns
    {
        "nvme0n1": {
            "read_iops": 420.35,
            "write_iops": 180.62,
            "total_iops": 600.97
        },

        "sda": {
            "read_iops": 58.12,
            "write_iops": 24.78,
            "total_iops": 82.90
        }
    }
"""
def get_disk_iops_per_disk():
    global _previous_per_disk_iops_io   # the previous snapshot of the  disk iops
    global _previous_per_disk_iops_time     # This is a Dictionary

    try:
        current_io = psutil.disk_io_counters(perdisk=True)
        #returns Key value pairs
        #key : disk name, Value : object containing the statistics for that disk.
        current_time = time.time()
        if not current_io:
            return {}

        result = {}
        for disk_name, io in current_io.items():    # Disk name , Object

            # First sample for this disk
            if disk_name not in _previous_per_disk_iops_io:
                _previous_per_disk_iops_io[disk_name] = io
                _previous_per_disk_iops_time[disk_name] = current_time
                result[disk_name] = {
                    "read_iops": 0,
                    "write_iops": 0,
                    "total_iops": 0
                }
                continue

            elapsed = (
                current_time -
                _previous_per_disk_iops_time[disk_name]
            )

            if elapsed <= 0:
                continue

            read_iops = (
                io.read_count -
                _previous_per_disk_iops_io[disk_name].read_count
            ) / elapsed
            write_iops = (
                io.write_count -
                _previous_per_disk_iops_io[disk_name].write_count
            ) / elapsed
            result[disk_name] = {
                "read_iops": round(read_iops, 2),
                "write_iops": round(write_iops, 2),
                "total_iops": round(read_iops + write_iops, 2)
            }
            _previous_per_disk_iops_io[disk_name] = io
            _previous_per_disk_iops_time[disk_name] = current_time

        return result

    except Exception as e:
        logger.error(
            f"Per-disk IOPS calculation failed: {e}"
        )
        return {}
# Should called at least twise


# Average system Disk latency since the system booted 
# The average time taken to complete one disk I/O operation.
"""
    Returns
    {
        "read_latency_ms": 4.8261,
        "write_latency_ms": 3.9157
    }
"""
def get_disk_latency():
    try:
        io = psutil.disk_io_counters()  # Returns IO counters obj
        """
        Returns an obj like
            read_count = 1000
            write_count = 500
            read_time = 5000 ms
            write_time = 3000 ms
        """
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


# average latency during the most recent monitoring interval for that disk
"""
    Returns
        {
            "nvme0n1": {
                "read_latency_ms": 0.8423,
                "write_latency_ms": 1.1278
            },
            "sda": {
                "read_latency_ms": 5.6841,
                "write_latency_ms": 7.1935
            }
        }
"""
def get_disk_latency_per_disk():
    global _previous_per_disk_latency_io
    global _previous_per_disk_latency_time

    try:
        current_io = psutil.disk_io_counters(perdisk=True)
        current_time = time.time()
        if not current_io:
            return {}
        result = {}
        for disk_name, io in current_io.items():

            # First sample for this disk
            if disk_name not in _previous_per_disk_latency_io:
                _previous_per_disk_latency_io[disk_name] = io
                _previous_per_disk_latency_time[disk_name] = current_time

                result[disk_name] = {
                    "read_latency_ms": 0,
                    "write_latency_ms": 0
                }
                continue

            read_latency = 0
            write_latency = 0

            read_count_delta = (
                io.read_count -
                _previous_per_disk_latency_io[disk_name].read_count
            )
            write_count_delta = (
                io.write_count -
                _previous_per_disk_latency_io[disk_name].write_count
            )

            if read_count_delta > 0:
                read_time_delta = (
                    io.read_time -
                    _previous_per_disk_latency_io[disk_name].read_time
                )
                read_latency = (
                    read_time_delta /
                    read_count_delta
                )

            if write_count_delta > 0:
                write_time_delta = (
                    io.write_time -
                    _previous_per_disk_latency_io[disk_name].write_time
                )
                write_latency = (
                    write_time_delta /
                    write_count_delta
                )

            result[disk_name] = {
                "read_latency_ms": round(read_latency, 4),
                "write_latency_ms": round(write_latency, 4)
            }
            _previous_per_disk_latency_io[disk_name] = io
            _previous_per_disk_latency_time[disk_name] = current_time

        return result

    except Exception as e:
        logger.error(
            f"Per-disk latency calculation failed: {e}"
        )
        return {}
# Should called at least twise


# The total time the all system disks has been busy performing I/O operations.
# Disk Busy Time
"""
    Returns
    {
        "busy_time_ms": 0,
        "busy_percentage": 0
    }
"""
def get_disk_busytime_percentage():
    global _previous_busy_io
    global _previous_busy_time

    try:
        current = psutil.disk_io_counters()
        current_time = time.time()

        if current is None:
            return {}

        # First sample
        if _previous_busy_io is None:
            _previous_busy_io = current
            _previous_busy_time = current_time

            return {
                "busy_time_ms": 0,
                "busy_percentage": 0
            }

        elapsed = current_time - _previous_busy_time

        if elapsed <= 0:
            return {}

        busy_time_delta = (
            getattr(current, "busy_time", 0) -
            getattr(_previous_busy_io, "busy_time", 0)
        )

        busy_percentage = (
            busy_time_delta /
            (elapsed * 1000)
        ) * 100

        _previous_busy_io = current
        _previous_busy_time = current_time

        return {
            "busy_time_ms": busy_time_delta,
            "busy_percentage": round(busy_percentage, 2)
        }

    except Exception as e:
        logger.error(
            f"Busy time calculation failed: {e}"
        )
        return {}


# The time a certain disk has been busy performing I/O operations.
"""
    Returns
    {
        "nvme0n1": {
            "busy_time_ms": 850,
            "busy_percentage": 17.0
        },
        "sda": {
            "busy_time_ms": 2400,
            "busy_percentage": 48.0
        }
    }
"""
def get_disk_busytime_percentage_per_disk():
    global _previous_per_disk_busy_io
    global _previous_per_disk_busy_time

    try:
        current_io = psutil.disk_io_counters(perdisk=True)
        current_time = time.time()

        if not current_io:
            return {}

        result = {}
        for disk_name, io in current_io.items():

            # First sample for this disk
            if disk_name not in _previous_per_disk_busy_io:
                _previous_per_disk_busy_io[disk_name] = io
                _previous_per_disk_busy_time[disk_name] = current_time
                result[disk_name] = {
                    "busy_time_ms": 0,
                    "busy_percentage": 0
                }
                continue

            elapsed = (
                current_time -
                _previous_per_disk_busy_time[disk_name]
            )

            if elapsed <= 0:
                continue

            busy_time_delta = (
                getattr(io, "busy_time", 0) -
                getattr(
                    _previous_per_disk_busy_io[disk_name],
                    "busy_time",
                    0
                )
            )
            busy_percentage = (
                busy_time_delta /
                (elapsed * 1000)
            ) * 100
            result[disk_name] = {
                "busy_time_ms": busy_time_delta,
                "busy_percentage": round(busy_percentage, 2)
            }

            _previous_per_disk_busy_io[disk_name] = io
            _previous_per_disk_busy_time[disk_name] = current_time
        return result

    except Exception as e:
        logger.error(
            f"Per-disk busy time calculation failed: {e}"
        )
        return {}
    

# Complete Disk Snapshot
def get_disk_stats_snapshot():
    snapshot = {
        "timestamp": 
            datetime.now().isoformat(),
        "hostname": 
            socket.gethostname(),

        # Disk Information
        "disk_usage":
            get_disk_usage(),
        "mounted_partitions": 
            get_mounted_partitions(),

        # Total Disk Statistics (All Disks Combined)
        "io_counters": 
            get_disk_io_counters(),
        "throughput": 
            get_disk_throughput(),
        "iops": 
            get_disk_iops(),
        "latency": 
            get_disk_latency(),
        "busy_time": 
            get_disk_busytime_percentage(),

        # Per-Disk Statistics
        "io_counters perdisk": 
            get_disk_io_counters_per_disk(),
        "throughput perdisk": 
            get_disk_throughput_per_disk(),
        "iops perdisk": 
            get_disk_iops_per_disk(),
        "latency perdisk": 
            get_disk_latency_per_disk(),
        "busy_time perdisk": 
            get_disk_busytime_percentage_per_disk()
        }
    return snapshot

