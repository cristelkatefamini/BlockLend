#!/usr/bin/env python
"""
Startup verification script for BlockLend Backend
Tests all imports and configurations
"""
import sys
import os
from pathlib import Path

# Add the app directory to the path
app_dir = Path(__file__).parent / 'app'
sys.path.insert(0, str(app_dir))

print("=" * 60)
print("BlockLend Backend - Startup Verification")
print("=" * 60)

# Test 1: Environment setup
print("\n[1/8] Checking Python environment...")
try:
    print(f"✓ Python version: {sys.version.split()[0]}")
    print(f"✓ Working directory: {os.getcwd()}")
except Exception as e:
    print(f"✗ Environment check failed: {e}")
    sys.exit(1)

# Test 2: Dependencies
print("\n[2/8] Checking dependencies...")
required_modules = [
    'flask', 'flask_cors', 'flask_sqlalchemy', 'flask_marshmallow',
    'marshmallow', 'sqlalchemy', 'jwt', 'web3', 'qrcode', 'cloudinary'
]

missing = []
for module in required_modules:
    try:
        __import__(module)
        print(f"✓ {module}")
    except ImportError:
        print(f"✗ {module} (missing)")
        missing.append(module)

if missing:
    print(f"\n⚠ Install missing dependencies: pip install {' '.join(missing)}")
    sys.exit(1)

# Test 3: Configuration
print("\n[3/8] Loading configuration...")
try:
    from config.settings import config, Config
    print(f"✓ Config loaded: {len(config)} environments")
    print(f"  - Database: {Config.SQLALCHEMY_DATABASE_URI}")
except Exception as e:
    print(f"✗ Configuration failed: {e}")
    sys.exit(1)

# Test 4: Database
print("\n[4/8] Initializing database...")
try:
    from config.database import db, BaseModel
    print(f"✓ SQLAlchemy initialized")
except Exception as e:
    print(f"✗ Database initialization failed: {e}")
    sys.exit(1)

# Test 5: Models
print("\n[5/8] Loading data models...")
try:
    from models.user import (
        User, UserRole, Asset, AssetStatus,
        Borrow, BorrowStatus, Transaction, TransactionType,
        TransactionStatus, Penalty, DamageReport
    )
    print(f"✓ All 11 models loaded successfully")
    models = [User, Asset, Borrow, Transaction, Penalty, DamageReport]
    for model in models:
        print(f"  - {model.__name__}")
except Exception as e:
    print(f"✗ Model loading failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 6: Services
print("\n[6/8] Loading services...")
try:
    from services.auth_service import AuthService
    from services.asset_service import AssetService
    from services.borrow_service import BorrowService
    from services.penalty_service import PenaltyService
    from services.transaction_service import TransactionService
    from services.blockchain_service import BlockchainService
    print(f"✓ All 6 services loaded successfully")
except Exception as e:
    print(f"✗ Service loading failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 7: Routes
print("\n[7/8] Loading routes...")
try:
    from routes.auth import auth_bp
    from routes.assets import assets_bp
    from routes.borrow import borrow_bp
    from routes.penalties import penalties_bp
    from routes.users import users_bp
    from routes.blockchain import blockchain_bp
    print(f"✓ All 6 route blueprints loaded successfully")
    print(f"  - auth_bp (/api/auth)")
    print(f"  - assets_bp (/api/assets)")
    print(f"  - borrow_bp (/api/borrow)")
    print(f"  - penalties_bp (/api/penalties)")
    print(f"  - users_bp (/api/users)")
    print(f"  - blockchain_bp (/api/blockchain)")
except Exception as e:
    print(f"✗ Route loading failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 8: Flask App
print("\n[8/8] Creating Flask application...")
try:
    from app import create_app
    test_app = create_app('testing')
    with test_app.app_context():
        print(f"✓ Flask app created successfully")
        print(f"  - Debug: {test_app.debug}")
        print(f"  - Testing: {test_app.testing}")
        print(f"  - Database: {test_app.config['SQLALCHEMY_DATABASE_URI']}")
except Exception as e:
    print(f"✗ Flask app creation failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("✓ ALL STARTUP CHECKS PASSED!")
print("=" * 60)
print("\nYou can now run the application:")
print("  python run.py")
print("\nAPI will be available at: http://localhost:5000")
print("=" * 60 + "\n")
