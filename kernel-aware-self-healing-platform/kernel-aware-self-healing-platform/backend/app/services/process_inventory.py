from repository.process_inventory import ( get_processes , save_processes , get_services,save_services)

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

def store_service_inventory(system_id, services):
    save_services(system_id, services)


def get_service_inventory(system_id):
    services = get_services(system_id)

    recommended = []
    others = []

    for service in services:
        if service.get("recommended") is True:
            recommended.append(service)
        else:
            others.append(service)

    return recommended + others