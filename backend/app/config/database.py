from pymongo import MongoClient
from pymongo.server_api import ServerApi
import os

class Database:
    """MongoDB database connection"""
    
    def __init__(self):
        self.client = None
        self.db = None
    
    def connect(self):
        """Connect to MongoDB"""
        mongodb_url = os.getenv('DATABASE_URL', 'mongodb://localhost:27017')
        db_name = os.getenv('DB_NAME', 'BlockLend')
        try:
            # Connect with server API version
            self.client = MongoClient(
                mongodb_url,
                server_api=ServerApi('1'),
                serverSelectionTimeoutMS=5000
            )
            # Verify connection
            self.client.admin.command('ping')
            self.db = self.client.get_database(db_name)
            print(f"✓ Connected to MongoDB database: {db_name}")
            return True
        except Exception as e:
            print(f"✗ MongoDB connection failed: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            print("✓ Disconnected from MongoDB")
    
    def get_collection(self, collection_name):
        """Get a MongoDB collection"""
        if self.db is None:
            raise Exception("Database not connected")
        return self.db[collection_name]
    
    def create_indexes(self):
        """Create database indexes"""
        try:
            # Users collection
            users = self.get_collection('users')
            users.create_index('email', unique=True)
            users.create_index('username', unique=True)
            users.create_index('wallet_address')
            
            # Assets collection
            assets = self.get_collection('assets')
            assets.create_index('owner_id')
            assets.create_index('status')
            
            # Borrow collection
            borrows = self.get_collection('borrows')
            borrows.create_index('borrower_id')
            borrows.create_index('asset_id')
            borrows.create_index('status')
            
            # Transactions collection
            transactions = self.get_collection('transactions')
            transactions.create_index('user_id')
            transactions.create_index('borrow_id')
            
            # Penalties collection
            penalties = self.get_collection('penalties')
            penalties.create_index('user_id')
            penalties.create_index('borrow_id')

            # Points collection (trust score & borrow stats per user)
            points = self.get_collection('points')
            points.create_index('user_id', unique=True)

            # Notifications collection
            notifications = self.get_collection('notifications')
            notifications.create_index('user_id')
            notifications.create_index([('user_id', 1), ('read', 1)])
            notifications.create_index('created_at')
            
            print("✓ Database indexes created")
        except Exception as e:
            print(f"Index creation warning: {e}")

# Create singleton instance
database = Database()
