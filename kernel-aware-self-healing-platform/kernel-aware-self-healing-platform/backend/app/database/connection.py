import mysql.connector

connection = None

def get_db_connection():
    global connection

    if connection is None or not connection.is_connected():
        connection = mysql.connector.connect(
            host="localhost",
            user="pasindu",
            password="1234",
            database="user_rules"
        )

    return connection