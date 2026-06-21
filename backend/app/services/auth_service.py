from models.user import User, UserRole
from config.database import db
from utils.hash_utils import hash_password, verify_password
from utils.validators import validate_email_format, validate_username, validate_password
import jwt
from flask import current_app
from datetime import datetime, timedelta

class AuthService:
    """Authentication service"""
    
    @staticmethod
    def register(username, email, password, full_name=None):
        """Register a new user"""
        # Validate inputs
        if not validate_username(username):
            raise ValueError("Invalid username format")
        
        if not validate_email_format(email):
            raise ValueError("Invalid email format")
        
        is_valid, message = validate_password(password)
        if not is_valid:
            raise ValueError(message)
        
        # Check if user exists
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            raise ValueError("Username already taken")
        
        existing_email = User.query.filter_by(email=email).first()
        if existing_email:
            raise ValueError("Email already registered")
        
        # Create user
        user = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            role=UserRole.BORROWER
        )
        
        db.session.add(user)
        db.session.commit()
        
        return user
    
    @staticmethod
    def login(username, password):
        """Login user"""
        user = User.query.filter_by(username=username).first()
        
        if not user or not verify_password(user.password_hash, password):
            raise ValueError("Invalid username or password")
        
        if not user.is_active:
            raise ValueError("User account is inactive")
        
        # Generate JWT token
        token = jwt.encode({
            'user_id': user.id,
            'username': user.username,
            'exp': datetime.utcnow() + current_app.config['JWT_ACCESS_TOKEN_EXPIRES']
        }, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')
        
        return user, token
    
    @staticmethod
    def get_user_by_id(user_id):
        """Get user by ID"""
        return User.query.get(user_id)
    
    @staticmethod
    def get_user_by_username(username):
        """Get user by username"""
        return User.query.filter_by(username=username).first()
    
    @staticmethod
    def update_profile(user_id, data):
        """Update user profile"""
        user = User.query.get(user_id)
        if not user:
            raise ValueError("User not found")
        
        if 'full_name' in data:
            user.full_name = data['full_name']
        if 'phone' in data:
            user.phone = data['phone']
        if 'wallet_address' in data:
            user.wallet_address = data['wallet_address']
        if 'profile_image' in data:
            user.profile_image = data['profile_image']
        
        db.session.commit()
        return user
    
    @staticmethod
    def link_wallet(user_id, wallet_address):
        """Link wallet to user account"""
        user = User.query.get(user_id)
        if not user:
            raise ValueError("User not found")
        
        existing = User.query.filter_by(wallet_address=wallet_address).first()
        if existing and existing.id != user_id:
            raise ValueError("Wallet already linked to another account")
        
        user.wallet_address = wallet_address
        db.session.commit()
        return user
    
    @staticmethod
    def verify_kyc(user_id, document_url):
        """Verify KYC"""
        user = User.query.get(user_id)
        if not user:
            raise ValueError("User not found")
        
        user.kyc_document_url = document_url
        user.kyc_submitted_at = datetime.utcnow()
        user.kyc_verified = True
        
        db.session.commit()
        return user
    
    @staticmethod
    def get_all_users(page=1, per_page=20):
        """Get all users with pagination"""
        return User.query.paginate(page=page, per_page=per_page)
