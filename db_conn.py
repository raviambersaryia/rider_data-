import os
import sqlite3
from dotenv import load_dotenv

# Load environment variables
root_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(root_dir, ".env"))

CONN_STRING = os.getenv("NEON_CONNECTION_STRING") or os.getenv("DATABASE_URL")
DB_PATH = os.getenv("DB_PATH", os.path.join(root_dir, "riders.db"))

db_type = "sqlite"

# Detect database type
if CONN_STRING:
    try:
        import psycopg

        # Test PostgreSQL connection
        with psycopg.connect(CONN_STRING) as conn:
            pass

        db_type = "postgres"
        print("[OK] Database: Connected to PostgreSQL (Neon)")

    except Exception as e:
        print(f"[WARNING] Failed to connect to PostgreSQL: {e}. Falling back to SQLite.")
        db_type = "sqlite"
else:
    print("[INFO] Database: No PostgreSQL connection string found. Using SQLite.")
    db_type = "sqlite"


def get_connection():
    """Get database connection"""

    if db_type == "postgres":
        import psycopg
        return psycopg.connect(CONN_STRING)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_database():

    if db_type == "sqlite":

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS riders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brand_name TEXT,
            store_name TEXT,
            employee_no TEXT UNIQUE,
            employee_name TEXT,
            employee_email TEXT,
            employee_phone TEXT,
            employee_gender TEXT,
            employee_dob TEXT,
            pan_number TEXT,
            employee_address TEXT,
            employee_city TEXT,
            employee_state TEXT,
            employee_pincode TEXT,
            nominee_name TEXT,
            nominee_gender TEXT,
            nominee_dob TEXT,
            nominee_relationship TEXT,
            profile_photo TEXT,
            insurance_status TEXT,
            insurance_policy_number TEXT,
            insurance_provider TEXT,
            insurance_start_date TEXT,
            insurance_end_date TEXT,
            coverage_amount TEXT,
            insurance_eligibility_status TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        conn.commit()
        conn.close()

        print(f"[OK] SQLite database initialized at {DB_PATH}")

    else:

        with get_connection() as conn:
            with conn.cursor() as cur:

                cur.execute("""
                CREATE TABLE IF NOT EXISTS rider_insurance_details (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    brand_name VARCHAR(255),
                    store_name VARCHAR(255),
                    employee_no VARCHAR(100) UNIQUE,
                    employee_name VARCHAR(255),
                    employee_email VARCHAR(255),
                    employee_mobile VARCHAR(50),
                    employee_gender VARCHAR(50),
                    employee_dob DATE,
                    employee_pan VARCHAR(50),
                    employee_address TEXT,
                    employee_city VARCHAR(100),
                    employee_state VARCHAR(100),
                    employee_pin_code VARCHAR(20),
                    nominee_name VARCHAR(255),
                    nominee_gender VARCHAR(50),
                    nominee_dob DATE,
                    nominee_relationship VARCHAR(100),
                    profile_photo TEXT,
                    insurance_status VARCHAR(50),
                    insurance_policy_number VARCHAR(100),
                    insurance_provider VARCHAR(255),
                    insurance_start_date VARCHAR(50),
                    insurance_end_date VARCHAR(50),
                    coverage_amount VARCHAR(100),
                    insurance_eligibility_status VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """)

                conn.commit()

                print("[OK] PostgreSQL table verified.")


try:
    initialize_database()
except Exception as e:
    print(f"[ERROR] Database initialization failed: {e}")
