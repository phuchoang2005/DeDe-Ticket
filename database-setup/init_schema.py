import mysql.connector
from mysql.connector import Error

DB_NAME = "event_ticketing"

def connect():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="your_password",
        autocommit=False
    )

def create_database(cursor):
    cursor.execute(
        f"CREATE DATABASE IF NOT EXISTS {DB_NAME} "
        "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    )

def use_db(cursor):
    cursor.execute(f"USE {DB_NAME}")

def create_tables(cursor):

    # USERS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS USERS (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255),
        full_name VARCHAR(255),
        phone VARCHAR(50),
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email)
    ) ENGINE=InnoDB;
    """)

    # ROLES
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ROLES (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        UNIQUE KEY unique_role (name)
    ) ENGINE=InnoDB;
    """)

    # USER_ROLES
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS USER_ROLES (
        user_id BIGINT,
        role_id BIGINT,
        PRIMARY KEY (user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES USERS(id),
        FOREIGN KEY (role_id) REFERENCES ROLES(id)
    ) ENGINE=InnoDB;
    """)

    # EVENT_CATEGORIES
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS EVENT_CATEGORIES (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        UNIQUE KEY unique_category (name)
    ) ENGINE=InnoDB;
    """)

    # EVENTS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS EVENTS (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        description TEXT,
        location VARCHAR(255),
        start_time DATETIME,
        end_time DATETIME,
        status VARCHAR(50),
        created_by BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_event_time (start_time, end_time),
        INDEX idx_event_status (status),
        FOREIGN KEY (created_by) REFERENCES USERS(id)
    ) ENGINE=InnoDB;
    """)

    # EVENT_CATEGORY_MAP
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS EVENT_CATEGORY_MAP (
        event_id BIGINT,
        category_id BIGINT,
        PRIMARY KEY (event_id, category_id),
        FOREIGN KEY (event_id) REFERENCES EVENTS(id),
        FOREIGN KEY (category_id) REFERENCES EVENT_CATEGORIES(id)
    ) ENGINE=InnoDB;
    """)

    # VENUES
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS VENUES (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        address VARCHAR(255)
    ) ENGINE=InnoDB;
    """)

    # SECTIONS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS SECTIONS (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        venue_id BIGINT,
        name VARCHAR(100),
        FOREIGN KEY (venue_id) REFERENCES VENUES(id),
        INDEX idx_venue (venue_id)
    ) ENGINE=InnoDB;
    """)

    # SEATS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS SEATS (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        section_id BIGINT,
        row_label VARCHAR(10),
        seat_number VARCHAR(10),
        UNIQUE KEY unique_seat (section_id, row_label, seat_number),
        FOREIGN KEY (section_id) REFERENCES SECTIONS(id)
    ) ENGINE=InnoDB;
    """)

    # EVENT_SEATS (Seat Locking)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS EVENT_SEATS (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        event_id BIGINT,
        seat_id BIGINT,
        status ENUM('AVAILABLE','LOCKED','BOOKED') DEFAULT 'AVAILABLE',
        locked_by BIGINT NULL,
        locked_until DATETIME NULL,
        version INT DEFAULT 0,

        UNIQUE KEY unique_event_seat (event_id, seat_id),

        INDEX idx_event_status (event_id, status),
        INDEX idx_locked_until (locked_until),

        FOREIGN KEY (event_id) REFERENCES EVENTS(id),
        FOREIGN KEY (seat_id) REFERENCES SEATS(id),
        FOREIGN KEY (locked_by) REFERENCES USERS(id)
    ) ENGINE=InnoDB;
    """)

    # TICKET_TYPES
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS TICKET_TYPES (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        event_id BIGINT,
        name VARCHAR(100),
        price DECIMAL(10,2),
        quantity INT,
        sold_quantity INT DEFAULT 0,
        FOREIGN KEY (event_id) REFERENCES EVENTS(id),
        INDEX idx_event_ticket (event_id)
    ) ENGINE=InnoDB;
    """)

    # ORDERS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ORDERS (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT,
        total_amount DECIMAL(10,2),
        status ENUM('PENDING','PAID','FAILED','CANCELLED'),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_orders (user_id),
        INDEX idx_status (status),
        FOREIGN KEY (user_id) REFERENCES USERS(id)
    ) ENGINE=InnoDB;
    """)

    # ORDER_ITEMS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ORDER_ITEMS (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        order_id BIGINT,
        ticket_type_id BIGINT,
        event_seat_id BIGINT,
        price DECIMAL(10,2),

        UNIQUE KEY unique_seat_booking (event_seat_id),

        INDEX idx_order (order_id),

        FOREIGN KEY (order_id) REFERENCES ORDERS(id),
        FOREIGN KEY (ticket_type_id) REFERENCES TICKET_TYPES(id),
        FOREIGN KEY (event_seat_id) REFERENCES EVENT_SEATS(id)
    ) ENGINE=InnoDB;
    """)

    # PAYMENTS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS PAYMENTS (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        order_id BIGINT,
        provider VARCHAR(50),
        transaction_id VARCHAR(255),
        amount DECIMAL(10,2),
        status ENUM('PENDING','SUCCESS','FAILED'),
        retry_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order_payment (order_id),
        INDEX idx_transaction (transaction_id),
        FOREIGN KEY (order_id) REFERENCES ORDERS(id)
    ) ENGINE=InnoDB;
    """)

    # PAYMENT_RETRIES
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS PAYMENT_RETRIES (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        payment_id BIGINT,
        status VARCHAR(50),
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES PAYMENTS(id),
        INDEX idx_payment_retry (payment_id)
    ) ENGINE=InnoDB;
    """)

    # TICKETS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS TICKETS (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        order_item_id BIGINT,
        qr_code VARCHAR(255) UNIQUE,
        status ENUM('VALID','USED','CANCELLED'),
        INDEX idx_qr (qr_code),
        FOREIGN KEY (order_item_id) REFERENCES ORDER_ITEMS(id)
    ) ENGINE=InnoDB;
    """)

    # CHECK_INS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS CHECK_INS (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        ticket_id BIGINT,
        checked_in_by BIGINT,
        checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50),
        UNIQUE KEY unique_checkin (ticket_id),
        INDEX idx_ticket (ticket_id),
        FOREIGN KEY (ticket_id) REFERENCES TICKETS(id),
        FOREIGN KEY (checked_in_by) REFERENCES USERS(id)
    ) ENGINE=InnoDB;
    """)

    # NOTIFICATIONS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS NOTIFICATIONS (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT,
        type VARCHAR(50),
        content TEXT,
        status VARCHAR(50),
        sent_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES USERS(id),
        INDEX idx_user_notification (user_id)
    ) ENGINE=InnoDB;
    """)

    # AUDIT_LOGS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS AUDIT_LOGS (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT,
        action VARCHAR(100),
        entity VARCHAR(100),
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES USERS(id),
        INDEX idx_user_log (user_id),
        INDEX idx_entity (entity)
    ) ENGINE=InnoDB;
    """)

def main():
    try:
        conn = connect()
        cursor = conn.cursor()

        create_database(cursor)
        use_db(cursor)
        create_tables(cursor)

        conn.commit()
        print("✅ Full schema (production-ready) created successfully!")

    except Error as e:
        print("❌ Error:", e)

    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    main()