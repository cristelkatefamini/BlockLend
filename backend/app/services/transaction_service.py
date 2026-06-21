from models.user import Transaction, TransactionType, TransactionStatus
from config.database import db
from datetime import datetime

class TransactionService:
    """Transaction service"""
    
    @staticmethod
    def create_transaction(user_id, transaction_type, amount, borrow_id=None, 
                          blockchain_tx_hash=None, from_address=None, to_address=None, 
                          description=None):
        """Create a transaction record"""
        if amount <= 0:
            raise ValueError("Amount must be positive")
        
        transaction = Transaction(
            user_id=user_id,
            borrow_id=borrow_id,
            transaction_type=TransactionType[transaction_type.upper()],
            amount=amount,
            status=TransactionStatus.PENDING,
            blockchain_tx_hash=blockchain_tx_hash,
            from_address=from_address,
            to_address=to_address,
            description=description
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        return transaction
    
    @staticmethod
    def get_transaction(transaction_id):
        """Get transaction by ID"""
        return Transaction.query.get(transaction_id)
    
    @staticmethod
    def get_user_transactions(user_id, transaction_type=None, status=None, page=1, per_page=20):
        """Get user's transactions"""
        query = Transaction.query.filter_by(user_id=user_id)
        
        if transaction_type:
            query = query.filter_by(transaction_type=TransactionType[transaction_type.upper()])
        
        if status:
            query = query.filter_by(status=TransactionStatus[status.upper()])
        
        return query.order_by(Transaction.created_at.desc()).paginate(page=page, per_page=per_page)
    
    @staticmethod
    def get_borrow_transactions(borrow_id, page=1, per_page=20):
        """Get transactions for a specific borrow"""
        return Transaction.query.filter_by(borrow_id=borrow_id).order_by(
            Transaction.created_at.desc()
        ).paginate(page=page, per_page=per_page)
    
    @staticmethod
    def update_transaction_status(transaction_id, status, blockchain_tx_hash=None):
        """Update transaction status"""
        transaction = Transaction.query.get(transaction_id)
        if not transaction:
            raise ValueError("Transaction not found")
        
        transaction.status = TransactionStatus[status.upper()]
        
        if blockchain_tx_hash:
            transaction.blockchain_tx_hash = blockchain_tx_hash
        
        db.session.commit()
        
        return transaction
    
    @staticmethod
    def get_all_transactions(page=1, per_page=20, status=None):
        """Get all transactions"""
        query = Transaction.query
        
        if status:
            query = query.filter_by(status=TransactionStatus[status.upper()])
        
        return query.order_by(Transaction.created_at.desc()).paginate(page=page, per_page=per_page)
