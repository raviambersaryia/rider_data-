# Rider Insurance Portal

A premium Rider Insurance Registration & Management system designed for delivery executive platforms (e.g. Zippee). It features real-time statistics, searching/filtering, detail timeline tracking, and dynamic SQLite/PostgreSQL switching with auto-schema migration.

## Directory Structure

```text
riders_Form-main/
├── backend/
│   ├── app.py          # Unified Flask API server
│   ├── db_conn.py      # Database helper with SQLite/Postgres auto-migration
│   ├── requirements.txt# Backend python package dependencies
│   └── .env            # Backend env configuration
├── frontend/
│   ├── index.html      # Dashboard UI (includes registration form)
│   ├── styles.css      # Custom dashboard styles & glassmorphism variables
│   ├── script.js       # Main dashboard operations & validations
│   ├── rider-profile.html # Detailed profile view
│   ├── rider-profile.css  # Detailed profile styles
│   ├── rider-profile.js   # Fetch & render detailed profile
│   └── .env            # Frontend environment backup
├── riders.db           # Local SQLite database fallback
└── .env                # Project configuration file
```

## Setup & Running the Application

### 1. Configure the Environment
Ensure your `.env` file at the root (or inside `backend/`) contains the necessary configurations:
- **For SQLite (default)**: Ensure `NEON_CONNECTION_STRING` or `DATABASE_URL` is commented out or blank.
- **For PostgreSQL (Neon)**: Set the `NEON_CONNECTION_STRING` variable to your Neon database URL.

### 2. Run the Backend API Server
Activate your virtual environment and run the backend script:
```bash
# Windows (cmd/PowerShell)
myvenv\Scripts\python.exe backend/app.py
```

The Flask server will start on [http://localhost:5001](http://localhost:5001), automatically initializing the database and migrating the tables/columns as required.

### 3. Open the Dashboard UI
Since the backend server serves both the API and the static files, you can access the full frontend application directly by opening:
👉 **[http://localhost:5001](http://localhost:5001)**

Alternatively, you can open `frontend/index.html` directly in your browser.