import os
from datetime import timedelta

class Settings:
    """Application settings"""
    
    # Database
    DATABASE_URL: str = os.getenv('DATABASE_URL', 'mongodb://localhost:27017/blocklend')
    
    # JWT
    SECRET_KEY: str = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_SECRET_KEY: str = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(days=30)
    ALGORITHM: str = 'HS256'
    
    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = os.getenv('CLOUDINARY_CLOUD_NAME', '')
    CLOUDINARY_API_KEY: str = os.getenv('CLOUDINARY_API_KEY', '')
    CLOUDINARY_API_SECRET: str = os.getenv('CLOUDINARY_API_SECRET', '')
    
    # Blockchain
    BLOCKCHAIN_NETWORK: str = os.getenv('BLOCKCHAIN_NETWORK', 'ganache')
    BLOCKCHAIN_RPC_URL: str = os.getenv('BLOCKCHAIN_RPC_URL', 'http://127.0.0.1:7545')
    BLOCKCHAIN_CONTRACT_ADDRESS: str = os.getenv('BLOCKCHAIN_CONTRACT_ADDRESS', '')
    
    # Upload paths
    UPLOAD_FOLDER: str = os.path.join(os.path.dirname(__file__), '../../..', 'uploads')
    QR_CODE_FOLDER: str = os.path.join(UPLOAD_FOLDER, 'qr_codes')
    ASSET_UPLOAD_FOLDER: str = os.path.join(UPLOAD_FOLDER, 'assets')
    DAMAGE_REPORT_FOLDER: str = os.path.join(UPLOAD_FOLDER, 'damage_reports')
    
    # App
    DEBUG: bool = os.getenv('DEBUG', 'True').lower() == 'true'
    API_PREFIX: str = '/api'
    API_TITLE: str = 'BlockLend API'
    API_VERSION: str = '1.0.0'

settings = Settings()
