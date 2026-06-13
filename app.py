import os
import sys

# Add the current directory and the api directory to the python path
root_dir = os.path.dirname(os.path.abspath(__file__))
api_dir = os.path.join(root_dir, "api")
if root_dir not in sys.path:
    sys.path.append(root_dir)
if api_dir not in sys.path:
    sys.path.append(api_dir)

# Import the Flask app from api/index.py
from api.index import app

if __name__ == '__main__':
    # Local running setup (same as index.py)
    port = int(os.getenv('FLASK_PORT', 5001))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() in ('true', '1', 'yes')
    
    print(f"Starting Rider Insurance Server (from root app.py) on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
