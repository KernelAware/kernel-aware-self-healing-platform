from repository.process_inventory import ( get_processes , save_processes
)

def store_process_inventory(system_id, processes):
    save_processes(system_id, processes)


def get_process_inventory(system_id):
    processes = get_processes(system_id)

    recommended = []
    others = []

    for process in processes:
        if process["recommended"] is True:
            recommended.append(process)
        else:
            others.append(process)

    return recommended + others