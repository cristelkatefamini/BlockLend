#!/usr/bin/env python3
"""Test script to verify all imports work correctly"""

import sys
import os

# Add app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

print("Testing imports...")

try:
    print("1. Testing config imports...")
    from app.config.settings import settings
    print(f"   ✓ Settings loaded: DEBUG={settings.DEBUG}, DB={settings.DATABASE_URL[:30]}...")
    
    from app.config.database import database
    print("   ✓ Database imported")
    
    from app.config.cloudinary import init_cloudinary
    print("   ✓ Cloudinary imported")
    
    print("\n2. Testing utility imports...")
    from app.utils.hash_utils import hash_password, verify_password
    print("   ✓ hash_utils imported")
    
    # Test hash/verify
    test_pwd = "TestPassword123!"
    hashed = hash_password(test_pwd)
    verified = verify_password(hashed, test_pwd)
    print(f"   ✓ Password hashing works: verified={verified}")
    
    print("\n3. Testing FastAPI app...")
    from app.app import app
    print("   ✓ FastAPI app created successfully")
    
    print("\n4. Testing auth router...")
    from app.routes.auth import router as auth_router
    print(f"   ✓ Auth router imported: {len(auth_router.routes)} routes")
    
    print("\n✅ All imports successful!")
    
except Exception as e:
    print(f"\n❌ Import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
