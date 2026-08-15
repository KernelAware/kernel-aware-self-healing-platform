from database.connection import get_db_connection


def load_cpu_rules():
    return load_rules_by_metric("cpu")

def load_memory_rules():
    return load_rules_by_metric("memory")

def load_disk_rules():
    return load_rules_by_metric("disk")

def load_network_rules():
    return load_rules_by_metric("network")

def load_process_rules():
    return load_rules_by_metric("process")

def load_rules_by_metric(metric_type):
    connection = get_db_connection()

    try:
        cursor = connection.cursor()

        query = """
            SELECT *
            FROM rules
            WHERE metric_type = %s
            AND enabled = TRUE
        """

        cursor.execute(query, (metric_type,))
        return cursor.fetchall()

    finally:
        cursor.close()
        connection.close()

def load_rules(metrics):
    pass

