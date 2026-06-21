from models.user import Borrow, BorrowStatus, Transaction, TransactionType, TransactionStatus, Penalty, Asset, User
from config.database import db
from datetime import datetime, timedelta
from utils.validators import validate_positive_number
import math

class BorrowService:
    """Borrow service"""
    
    @staticmethod
    def create_borrow_request(borrower_id, asset_id, loan_amount, interest_rate, duration_days, lender_wallet=None):
        """Create a borrow request"""
        # Validate inputs
        if not validate_positive_number(loan_amount):
            raise ValueError("Loan amount must be positive")
        
        if not validate_positive_number(interest_rate, -1) or interest_rate > 100:
            raise ValueError("Interest rate must be between 0 and 100")
        
        if duration_days <= 0:
            raise ValueError("Duration must be positive")
        
        # Check asset
        asset = Asset.query.get(asset_id)
        if not asset:
            raise ValueError("Asset not found")
        
        if asset.owner_id != borrower_id:
            raise ValueError("Asset does not belong to borrower")
        
        # Calculate total interest
        total_interest = (loan_amount * interest_rate * duration_days) / (365 * 100)
        
        borrow = Borrow(
            borrower_id=borrower_id,
            asset_id=asset_id,
            loan_amount=loan_amount,
            interest_rate=interest_rate,
            duration_days=duration_days,
            total_interest=total_interest,
            status=BorrowStatus.PENDING,
            lender_wallet=lender_wallet
        )
        
        db.session.add(borrow)
        db.session.commit()
        
        return borrow
    
    @staticmethod
    def approve_borrow(borrow_id):
        """Approve a borrow request"""
        borrow = Borrow.query.get(borrow_id)
        if not borrow:
            raise ValueError("Borrow record not found")
        
        if borrow.status != BorrowStatus.PENDING:
            raise ValueError("Can only approve pending requests")
        
        borrow.status = BorrowStatus.APPROVED
        db.session.commit()
        
        return borrow
    
    @staticmethod
    def activate_borrow(borrow_id, blockchain_tx_hash=None):
        """Activate a borrow (disbursement happens)"""
        borrow = Borrow.query.get(borrow_id)
        if not borrow:
            raise ValueError("Borrow record not found")
        
        if borrow.status != BorrowStatus.APPROVED:
            raise ValueError("Can only activate approved borrows")
        
        borrow.status = BorrowStatus.ACTIVE
        borrow.start_date = datetime.utcnow()
        borrow.due_date = datetime.utcnow() + timedelta(days=borrow.duration_days)
        borrow.blockchain_tx_hash = blockchain_tx_hash
        
        # Pledge the asset
        asset = Asset.query.get(borrow.asset_id)
        asset.pledged_amount = borrow.loan_amount
        
        # Create transaction record
        transaction = Transaction(
            user_id=borrow.borrower_id,
            borrow_id=borrow_id,
            transaction_type=TransactionType.LOAN_DISBURSEMENT,
            amount=borrow.loan_amount,
            status=TransactionStatus.COMPLETED,
            blockchain_tx_hash=blockchain_tx_hash,
            description=f"Loan disbursement for borrow ID {borrow_id}"
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        return borrow
    
    @staticmethod
    def get_borrow(borrow_id):
        """Get borrow record"""
        return Borrow.query.get(borrow_id)
    
    @staticmethod
    def get_user_borrows(user_id, status=None, page=1, per_page=20):
        """Get user's borrow records"""
        query = Borrow.query.filter_by(borrower_id=user_id)
        
        if status:
            query = query.filter_by(status=BorrowStatus[status.upper()])
        
        return query.paginate(page=page, per_page=per_page)
    
    @staticmethod
    def repay_borrow(borrow_id, amount, blockchain_tx_hash=None):
        """Repay a borrow"""
        borrow = Borrow.query.get(borrow_id)
        if not borrow:
            raise ValueError("Borrow record not found")
        
        if borrow.status not in [BorrowStatus.ACTIVE, BorrowStatus.DEFAULTED]:
            raise ValueError("Borrow is not active or defaulted")
        
        if amount <= 0:
            raise ValueError("Amount must be positive")
        
        # Calculate remaining amount
        remaining_amount = (borrow.loan_amount + borrow.total_interest) - borrow.repaid_amount
        
        if amount > remaining_amount:
            raise ValueError(f"Amount exceeds remaining balance of {remaining_amount}")
        
        # Update repaid amount
        borrow.repaid_amount += amount
        
        # Check if fully repaid
        if borrow.repaid_amount >= (borrow.loan_amount + borrow.total_interest):
            borrow.status = BorrowStatus.REPAID
            borrow.repaid_date = datetime.utcnow()
            
            # Release asset
            asset = Asset.query.get(borrow.asset_id)
            asset.pledged_amount = 0
            asset.status = AssetStatus.AVAILABLE
            
            # Update user credit score
            borrower = User.query.get(borrow.borrower_id)
            borrower.credit_score = min(100, borrower.credit_score + 5)
        
        # Create transaction record
        transaction = Transaction(
            user_id=borrow.borrower_id,
            borrow_id=borrow_id,
            transaction_type=TransactionType.REPAYMENT,
            amount=amount,
            status=TransactionStatus.COMPLETED,
            blockchain_tx_hash=blockchain_tx_hash,
            description=f"Repayment for borrow ID {borrow_id}"
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        return borrow
    
    @staticmethod
    def default_borrow(borrow_id):
        """Mark borrow as defaulted"""
        borrow = Borrow.query.get(borrow_id)
        if not borrow:
            raise ValueError("Borrow record not found")
        
        if borrow.status != BorrowStatus.ACTIVE:
            raise ValueError("Only active borrows can be defaulted")
        
        if datetime.utcnow() <= borrow.due_date:
            raise ValueError("Borrow is not yet due")
        
        borrow.status = BorrowStatus.DEFAULTED
        
        # Repossess asset
        asset = Asset.query.get(borrow.asset_id)
        asset.status = AssetStatus.REPOSSESSED
        
        # Reduce credit score
        borrower = User.query.get(borrow.borrower_id)
        borrower.credit_score = max(0, borrower.credit_score - 20)
        
        db.session.commit()
        
        return borrow
    
    @staticmethod
    def cancel_borrow(borrow_id):
        """Cancel a borrow request"""
        borrow = Borrow.query.get(borrow_id)
        if not borrow:
            raise ValueError("Borrow record not found")
        
        if borrow.status not in [BorrowStatus.PENDING, BorrowStatus.APPROVED]:
            raise ValueError("Can only cancel pending or approved borrows")
        
        borrow.status = BorrowStatus.CANCELLED
        db.session.commit()
        
        return borrow
    
    @staticmethod
    def get_all_borrows(page=1, per_page=20, status=None):
        """Get all borrow records"""
        query = Borrow.query
        
        if status:
            query = query.filter_by(status=BorrowStatus[status.upper()])
        
        return query.paginate(page=page, per_page=per_page)
    
    @staticmethod
    def calculate_interest(loan_amount, interest_rate, duration_days):
        """Calculate interest amount"""
        return (loan_amount * interest_rate * duration_days) / (365 * 100)
    
    @staticmethod
    def check_overdue_borrows():
        """Check for overdue borrows and create penalties"""
        from models.user import AssetStatus
        
        active_borrows = Borrow.query.filter_by(status=BorrowStatus.ACTIVE).all()
        now = datetime.utcnow()
        
        for borrow in active_borrows:
            if now > borrow.due_date:
                days_overdue = (now - borrow.due_date).days
                
                # Check if penalty already exists
                existing_penalty = Penalty.query.filter_by(
                    borrow_id=borrow.id,
                    is_paid=False
                ).first()
                
                if not existing_penalty:
                    # Calculate penalty (e.g., 1% per day overdue)
                    penalty_amount = (borrow.loan_amount * 0.01 * days_overdue)
                    
                    penalty = Penalty(
                        user_id=borrow.borrower_id,
                        borrow_id=borrow.id,
                        penalty_amount=penalty_amount,
                        penalty_reason=f"{days_overdue} days overdue",
                        days_overdue=days_overdue
                    )
                    
                    db.session.add(penalty)
        
        db.session.commit()
