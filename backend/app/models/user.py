import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import db, BaseModel
from datetime import datetime
import enum

class UserRole(enum.Enum):
    BORROWER = "borrower"
    LENDER = "lender"
    ADMIN = "admin"

class User(BaseModel):
    """User model"""
    __tablename__ = 'users'
    
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    wallet_address = db.Column(db.String(42), unique=True, nullable=True, index=True)
    phone = db.Column(db.String(20), nullable=True)
    full_name = db.Column(db.String(120), nullable=True)
    role = db.Column(db.Enum(UserRole), default=UserRole.BORROWER)
    profile_image = db.Column(db.String(500), nullable=True)
    kyc_verified = db.Column(db.Boolean, default=False)
    kyc_document_url = db.Column(db.String(500), nullable=True)
    kyc_submitted_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    total_borrowed = db.Column(db.Float, default=0.0)
    total_lent = db.Column(db.Float, default=0.0)
    credit_score = db.Column(db.Float, default=0.0)
    
    # Relationships
    assets = db.relationship('Asset', backref='owner', lazy=True, foreign_keys='Asset.owner_id')
    borrow_records = db.relationship('Borrow', backref='borrower', lazy=True, foreign_keys='Borrow.borrower_id')
    transactions = db.relationship('Transaction', backref='user', lazy=True, foreign_keys='Transaction.user_id')
    penalties = db.relationship('Penalty', backref='user', lazy=True, foreign_keys='Penalty.user_id')
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            **super().to_dict(),
            'username': self.username,
            'email': self.email,
            'wallet_address': self.wallet_address,
            'phone': self.phone,
            'full_name': self.full_name,
            'role': self.role.value,
            'profile_image': self.profile_image,
            'kyc_verified': self.kyc_verified,
            'is_active': self.is_active,
            'total_borrowed': self.total_borrowed,
            'total_lent': self.total_lent,
            'credit_score': self.credit_score
        }

class AssetStatus(enum.Enum):
    AVAILABLE = "available"
    PLEDGED = "pledged"
    REPOSSESSED = "repossessed"
    DAMAGED = "damaged"

class Asset(BaseModel):
    """Asset model"""
    __tablename__ = 'assets'
    
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    asset_type = db.Column(db.String(50), nullable=False)
    status = db.Column(db.Enum(AssetStatus), default=AssetStatus.AVAILABLE)
    estimated_value = db.Column(db.Float, nullable=False)
    condition = db.Column(db.String(50), default='good')
    image_url = db.Column(db.String(500), nullable=True)
    qr_code_url = db.Column(db.String(500), nullable=True)
    serial_number = db.Column(db.String(100), unique=True, nullable=True, index=True)
    location = db.Column(db.String(200), nullable=True)
    pledged_amount = db.Column(db.Float, default=0.0)
    
    # Relationships
    borrow_records = db.relationship('Borrow', backref='asset', lazy=True)
    damage_reports = db.relationship('DamageReport', backref='asset', lazy=True)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            **super().to_dict(),
            'owner_id': self.owner_id,
            'name': self.name,
            'description': self.description,
            'asset_type': self.asset_type,
            'status': self.status.value,
            'estimated_value': self.estimated_value,
            'condition': self.condition,
            'image_url': self.image_url,
            'qr_code_url': self.qr_code_url,
            'serial_number': self.serial_number,
            'location': self.location,
            'pledged_amount': self.pledged_amount
        }

class BorrowStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    ACTIVE = "active"
    REPAID = "repaid"
    DEFAULTED = "defaulted"
    CANCELLED = "cancelled"

class Borrow(BaseModel):
    """Borrow record model"""
    __tablename__ = 'borrows'
    
    borrower_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    asset_id = db.Column(db.Integer, db.ForeignKey('assets.id'), nullable=False, index=True)
    loan_amount = db.Column(db.Float, nullable=False)
    interest_rate = db.Column(db.Float, nullable=False)  # Annual percentage
    duration_days = db.Column(db.Integer, nullable=False)
    status = db.Column(db.Enum(BorrowStatus), default=BorrowStatus.PENDING)
    start_date = db.Column(db.DateTime, nullable=True)
    due_date = db.Column(db.DateTime, nullable=True)
    repaid_date = db.Column(db.DateTime, nullable=True)
    repaid_amount = db.Column(db.Float, default=0.0)
    total_interest = db.Column(db.Float, nullable=True)
    blockchain_tx_hash = db.Column(db.String(100), nullable=True, index=True)
    lender_wallet = db.Column(db.String(42), nullable=True)
    
    # Relationships
    transactions = db.relationship('Transaction', backref='borrow', lazy=True)
    penalties = db.relationship('Penalty', backref='borrow', lazy=True)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            **super().to_dict(),
            'borrower_id': self.borrower_id,
            'asset_id': self.asset_id,
            'loan_amount': self.loan_amount,
            'interest_rate': self.interest_rate,
            'duration_days': self.duration_days,
            'status': self.status.value,
            'start_date': self.start_date,
            'due_date': self.due_date,
            'repaid_date': self.repaid_date,
            'repaid_amount': self.repaid_amount,
            'total_interest': self.total_interest,
            'blockchain_tx_hash': self.blockchain_tx_hash
        }

class TransactionType(enum.Enum):
    LOAN_DISBURSEMENT = "loan_disbursement"
    REPAYMENT = "repayment"
    INTEREST_PAYMENT = "interest_payment"
    PENALTY_PAYMENT = "penalty_payment"
    COLLATERAL_RELEASE = "collateral_release"

class TransactionStatus(enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

class Transaction(BaseModel):
    """Transaction model"""
    __tablename__ = 'transactions'
    
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    borrow_id = db.Column(db.Integer, db.ForeignKey('borrows.id'), nullable=True, index=True)
    transaction_type = db.Column(db.Enum(TransactionType), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.Enum(TransactionStatus), default=TransactionStatus.PENDING)
    blockchain_tx_hash = db.Column(db.String(100), nullable=True, index=True)
    from_address = db.Column(db.String(42), nullable=True)
    to_address = db.Column(db.String(42), nullable=True)
    description = db.Column(db.Text, nullable=True)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            **super().to_dict(),
            'user_id': self.user_id,
            'borrow_id': self.borrow_id,
            'transaction_type': self.transaction_type.value,
            'amount': self.amount,
            'status': self.status.value,
            'blockchain_tx_hash': self.blockchain_tx_hash,
            'description': self.description
        }

class Penalty(BaseModel):
    """Penalty model for late payments"""
    __tablename__ = 'penalties'
    
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    borrow_id = db.Column(db.Integer, db.ForeignKey('borrows.id'), nullable=False, index=True)
    penalty_amount = db.Column(db.Float, nullable=False)
    penalty_reason = db.Column(db.String(200), nullable=False)
    days_overdue = db.Column(db.Integer, nullable=False)
    is_paid = db.Column(db.Boolean, default=False)
    paid_date = db.Column(db.DateTime, nullable=True)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            **super().to_dict(),
            'user_id': self.user_id,
            'borrow_id': self.borrow_id,
            'penalty_amount': self.penalty_amount,
            'penalty_reason': self.penalty_reason,
            'days_overdue': self.days_overdue,
            'is_paid': self.is_paid,
            'paid_date': self.paid_date
        }

class DamageReport(BaseModel):
    """Damage report for assets"""
    __tablename__ = 'damage_reports'
    
    asset_id = db.Column(db.Integer, db.ForeignKey('assets.id'), nullable=False, index=True)
    reported_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    description = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(20), nullable=False)  # minor, moderate, severe
    image_url = db.Column(db.String(500), nullable=True)
    is_resolved = db.Column(db.Boolean, default=False)
    resolution = db.Column(db.Text, nullable=True)
    
    reported_by = db.relationship('User', foreign_keys=[reported_by_id])
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            **super().to_dict(),
            'asset_id': self.asset_id,
            'reported_by_id': self.reported_by_id,
            'description': self.description,
            'severity': self.severity,
            'is_resolved': self.is_resolved,
            'resolution': self.resolution
        }
