import psutil
import time

process_cache = {}

def initialize_cpu_measurement():
    for process in psutil.process_iter():
        try:
            process.cpu_percent(None)
        except:
            pass

def collect_processes():
    processes = []

    for process in psutil.process_iter():
        try:
            info = process.as_dict(
                attrs=[
                    "pid",
                    "name",
                    "status",
                    "username",
                    "memory_percent",
                    "memory_info",
                    "create_time",
                    "num_threads",
                    "ppid",
                    "cmdline",
                    "io_counters"
                ]
            )
            memory = process.memory_info()

            try:
                io = process.io_counters()
                read_bytes = io.read_bytes
                write_bytes = io.write_bytes
            except:
                read_bytes = 0
                write_bytes = 0

            try:
                connections = len(process.net_connections())
            except:
                connections = 0

            try:
                open_files = len(process.open_files())
            except:
                open_files = 0


            processes.append({

                "pid": info["pid"],
                "name": info["name"],
                "username": info["username"],
                "ppid": info["ppid"],
                "status": info["status"],
                "cpu_percent": process.cpu_percent(None)/psutil.cpu_count(),
                "memory_percent": info["memory_percent"],
                "memory_rss_bytes": memory.rss,
                "memory_vms_bytes": memory.vms,
                "create_time": info["create_time"],
                "uptime_seconds":
                    time.time() - info["create_time"],
                "num_threads": info["num_threads"],
                "command":
                    " ".join(info["cmdline"])
                    if info["cmdline"]
                    else "",
                "disk_read_bytes": read_bytes,
                "disk_write_bytes": write_bytes,
                "network_connections": connections,
                "open_files": open_files

            })


        except (
            psutil.NoSuchProcess,
            psutil.AccessDenied,
            psutil.ZombieProcess
        ):
            pass


    return processes

def get_process_info(pid):
    try:
        process = psutil.Process(pid)

        return {
            "pid": process.pid,
            "name": process.name(),
            "status": process.status(),
            "username": process.username(),
            "cpu_percent": process.cpu_percent(),
            "memory_percent": process.memory_percent(),
            "create_time": process.create_time(),
            "num_threads": process.num_threads(),
        }


    except psutil.NoSuchProcess:

        return {"error": "Process not found"}


    except psutil.AccessDenied:

        return {"error": "Access denied"}

def get_process_summary():
    running = 0
    sleeping = 0
    stopped = 0
    zombie = 0
    total = 0
    idle=0

    try:
        for process in psutil.process_iter(["status"]):

            status = process.info["status"]

            if status == "running":
                running += 1

            elif status == "sleeping":
                sleeping += 1

            elif status == "stopped":
                stopped += 1

            elif status == "zombie":
                zombie += 1

            elif status ==  "idle" :
                idle += 1

            total += 1

    except psutil.NoSuchProcess:
        pass

    return {
        "total": total,
        "running": running,
        "sleeping": sleeping,
        "stopped": stopped,
        "idle": idle,
        "zombie": zombie
    }

def get_top_memory_usage():
    processes = collect_processes()

    return sorted(
        processes,
        key=lambda p: p["memory_percent"],
        reverse=True
    )[:10]

def get_top_disk_usage():
    processes = collect_processes()

    return sorted(
        processes,
        key=lambda p: p["disk_percent"],
        reverse=True
    )[:10]

def detect_high_cpu_processes(threshold=80):
    processes = collect_processes()
    high_cpu = []

    for process in processes:

        if process["cpu_percent"] >= threshold:
            high_cpu.append(process)

    return high_cpu

def print_process():
    processes = collect_processes()
    processes_details=get_process_summary()

    print(processes_details)

    #for process in processes:
        #print(
            #str(process["pid"]) + "\n" +
            #process["name"] + "\n" +
            #process["status"] + "\n" +
            #str(process["cpu_percent"]) + "\n" +
            #str(process["memory_percent"]) + "\n" +
            #str(process["create_time"]) + "\n" +
            #str(process["num_threads"]) + "\n\n"
        #)

    print(get_top_memory_usage())
