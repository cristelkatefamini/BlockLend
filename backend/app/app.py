from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
import sys
from datetime import datetime

# Add app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config.database import database
from config.settings import settings
from config.cloudinary import init_cloudinary

# Create upload directories
os.makedirs(settings.QR_CODE_FOLDER, exist_ok=True)
os.makedirs(settings.ASSET_UPLOAD_FOLDER, exist_ok=True)
os.makedirs(settings.DAMAGE_REPORT_FOLDER, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage app lifecycle - startup and shutdown"""
    print("\n" + "="*60)
    print(f"Starting BlockLend FastAPI on 0.0.0.0:8000")
    print(f"Environment: production")
    print(f"API Documentation: http://0.0.0.0:8000/api")
    print("="*60 + "\n")

    database.connect()
    database.create_indexes()
    init_cloudinary()

    yield

    database.disconnect()

app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description="Blockchain-based peer-to-peer lending platform",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    }

@app.get("/api")
async def root():
    """API root endpoint"""
    return {
        'name': 'BlockLend API',
        'version': '1.0.0',
        'description': 'Blockchain-based lending platform API',
        'endpoints': {
            'auth': '/api/auth',
            'assets': '/api/assets',
            'borrow': '/api/borrow',
            'penalties': '/api/penalties',
            'users': '/api/users',
            'blockchain': '/api/blockchain',
            'health': '/api/health'
        }
    }

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "details": str(exc)}
    )

from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.assets import router as assets_router
from routes.admin import router as admin_router
from routes.borrow import router as borrow_router
from routes.blockchain import router as blockchain_router
from routes.notifications import router as notifications_router
from routes.messages import router as messages_router

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(assets_router, tags=["assets"])
app.include_router(admin_router, tags=["admin"])
app.include_router(borrow_router, tags=["borrow"])
app.include_router(blockchain_router, tags=["blockchain"])
app.include_router(notifications_router, tags=["notifications"])
app.include_router(messages_router, tags=["messages"])

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        app,
        host='0.0.0.0',
        port=8000,
        reload=settings.DEBUG
    )

