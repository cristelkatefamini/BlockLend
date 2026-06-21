from models.user import Penalty, Transaction, TransactionType, TransactionStatus
from config.database import db
from datetime import datetime

class PenaltyService:
    """Penalty service"""
    
    @staticmethod
    def get_user_penalties(user_id, paid_status=None, page=1, per_page=20):
        """Get user's penalties"""
        query = Penalty.query.filter_by(user_id=user_id)
        
        if paid_status is not None:
            query = query.filter_by(is_paid=paid_status)
        
        return query.paginate(page=page, per_page=per_page)
    
    @staticmethod
    def get_penalty(penalty_id):
        """Get penalty by ID"""
        return Penalty.query.get(penalty_id)
    
    @staticmethod
    def pay_penalty(penalty_id, amount, blockchain_tx_hash=None):
        """Pay penalty"""
        penalty = Penalty.query.get(penalty_id)
        if not penalty:
            raise ValueError("Penalty not found")
        
        if penalty.is_paid:
            raise ValueError("Penalty is already paid")
        
        if amount < penalty.penalty_amount:
            raise ValueError(f"Amount must be at least {penalty.penalty_amount}")
        
        # Mark penalty as paid
        penalty.is_paid = True
        penalty.paid_date = datetime.utcnow()
        
        # Create transaction record
        transaction = Transaction(
            user_id=penalty.user_id,
            borrow_id=penalty.borrow_id,
            transaction_type=TransactionType.PENALTY_PAYMENT,
            amount=amount,
            status=TransactionStatus.COMPLETED,
            blockchain_tx_hash=blockchain_tx_hash,
            description=f"Penalty payment for penalty ID {penalty_id}"
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        return penalty
    
    @staticmethod
    def get_pending_penalties(page=1, per_page=20):
        """Get all pending penalties"""
        return Penalty.query.filter_by(is_paid=False).paginate(page=page, per_page=per_page)
    
    @staticmethod
    def get_all_penalties(page=1, per_page=20):
        """Get all penalties"""
        return Penalty.query.paginate(page=page, per_page=per_page)
