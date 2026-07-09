import psutil

def collect_processes():
    processes = []
    for process in psutil.process_iter([
            "pid",
            "name",
            "status",
            "username",
            "cpu_percent",
            "memory_percent",
            "create_time",
            "num_threads",
    ]):
        try:
            processes.append({
                "pid": process.pid,
                "name": process.name(),
                "status": process.status(),
                "username": process.username(),
                "cpu_percent": process.cpu_percent(),
                "memory_percent": process.memory_percent(),
                "create_time": process.create_time(),
                "num_threads": process.num_threads(),
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
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

    try:
        for process in psutil.process_iter([
                "status"
        ]):
            if process["status"] == "running":
                running += 1

            elif process["status"] == "sleeping":
                sleeping += 1

            elif process["status"] == "stopped":
                stopped += 1

            elif process["status"] == "zombie":
                zombie += 1
            total += 1
    except psutil.NoSuchProcess:
        pass

    return {
        "total": total,
        "running": running,
        "sleeping": sleeping,
        "stopped": stopped,
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

    for process in processes:
        print(
            str(process["pid"]) + "\n" +
            process["name"] + "\n" +
            process["status"] + "\n" +
            str(process["cpu_percent"]) + "\n" +
            str(process["memory_percent"]) + "\n" +
            str(process["create_time"]) + "\n" +
            str(process["num_threads"]) + "\n\n"
        )

    print(get_top_memory_usage())

print_process()