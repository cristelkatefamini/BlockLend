#!/usr/bin/env python
import sys
import os
from pathlib import Path

# Add the app directory to the path
app_dir = Path(__file__).parent / 'app'
sys.path.insert(0, str(app_dir))

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / '.env')
except ImportError:
    print("Warning: python-dotenv not installed. Environment variables from .env file will not be loaded.")

# Import and run the FastAPI app
from app import app
import uvicorn

if __name__ == '__main__':
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', '8000'))
    debug = os.getenv('DEBUG', 'False').lower() == 'true'

    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )

