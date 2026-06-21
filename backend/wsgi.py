#!/usr/bin/env python
"""WSGI entry point for production deployment"""
import sys
import os
from pathlib import Path

# Add the app directory to the path
app_dir = Path(__file__).parent / 'app'
sys.path.insert(0, str(app_dir))

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Import Flask app
from app import create_app

# Create the application
config_name = os.getenv('FLASK_ENV', 'production')
app = create_app(config_name)

if __name__ == '__main__':
    app.run()
