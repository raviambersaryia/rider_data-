import os
import sqlite3
from dotenv import load_dotenv

# Robustly find and load the .env file from the root directory
root_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(root_dir, ".env"))

CONN_STRING = os.getenv("NEON_CONNECTION_STRING") or os.getenv("DATABASE_URL")
DB_PATH = os.getenv("DB_PATH", os.path.join(root_dir, "riders.db"))

pool = None
db_type = "sqlite"

# Try setting up PostgreSQL if connection string is provided
if CONN_STRING:
    try:
        from psycopg_pool import ConnectionPool
        import psycopg
        
        # Test connection first
        with psycopg.connect(CONN_STRING) as conn:
            pass
        
        # Connection succeeded, setup connection pool
        pool = ConnectionPool(CONN_STRING, min_size=1, max_size=5)
        db_type = "postgres"
        print("[OK] Database: Connected to PostgreSQL (Neon)")
    except Exception as e:
        print(f"[WARNING] Failed to connect to PostgreSQL: {e}. Falling back to SQLite.")
        db_type = "sqlite"
else:
    print("[INFO] Database: No PostgreSQL connection string found. Using local SQLite.")
    db_type = "sqlite"


def get_connection():
    """Returns database connection based on active database type"""
    if db_type == "postgres":
        if pool:
            return pool.connection()
        else:
            import psycopg
            return psycopg.connect(CONN_STRING)
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn


def initialize_database():
    """Initializes the database table and handles migrations (adding missing columns)"""
    if db_type == "sqlite":
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS riders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                brand_name TEXT NOT NULL,
                store_name TEXT NOT NULL,
                employee_no TEXT UNIQUE NOT NULL,
                employee_name TEXT NOT NULL,
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
        
    elif db_type == "postgres":
        import psycopg
        with get_connection() as conn:
            with conn.cursor() as cur:
                # 1. Create table if not exists (in case it is a new Neon DB instance)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS rider_insurance_details (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        brand_name VARCHAR,
                        store_name VARCHAR,
                        employee_no VARCHAR UNIQUE,
                        employee_name VARCHAR,
                        employee_email VARCHAR,
                        employee_mobile VARCHAR,
                        employee_gender VARCHAR,
                        employee_dob DATE,
                        employee_pan VARCHAR,
                        employee_address TEXT,
                        employee_city VARCHAR,
                        employee_state VARCHAR,
                        employee_pin_code VARCHAR,
                        nominee_name VARCHAR,
                        nominee_gender VARCHAR,
                        nominee_dob DATE,
                        nominee_relationship VARCHAR,
                        insurance_status VARCHAR,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                conn.commit()
                
                # 2. Fetch existing columns to see if we need to run migrations
                cur.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'rider_insurance_details'
                """)
                existing_columns = {row[0] for row in cur.fetchall()}
                
                # Missing columns that are needed for full app features
                missing_columns = {
                    "profile_photo": "TEXT",
                    "insurance_policy_number": "VARCHAR",
                    "insurance_provider": "VARCHAR",
                    "insurance_start_date": "VARCHAR",
                    "insurance_end_date": "VARCHAR",
                    "coverage_amount": "VARCHAR",
                    "insurance_eligibility_status": "VARCHAR",
                    "updated_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
                }
                
                migrated = False
                for col_name, col_type in missing_columns.items():
                    if col_name not in existing_columns:
                        print(f"[INFO] Migrating: Adding missing column '{col_name}' to PostgreSQL table.")
                        cur.execute(f"ALTER TABLE rider_insurance_details ADD COLUMN {col_name} {col_type}")
                        migrated = True
                
                if migrated:
                    conn.commit()
                    print("[OK] PostgreSQL table schema migrated successfully.")
                else:
                    print("[OK] PostgreSQL table schema is up to date.")


# Initialize DB on load
try:
    initialize_database()
except Exception as e:
    print(f"[ERROR] Error initializing database: {e}")
