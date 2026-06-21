# BlockLend Backend API

## Overview
BlockLend is a blockchain-based peer-to-peer lending platform that allows users to borrow money by pledging digital assets as collateral on the blockchain.

## Installation & Setup

### Prerequisites
- Python 3.8+
- pip or conda
- Virtual environment (recommended)

### Installation Steps

1. **Create and activate virtual environment:**
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # On Windows
   source .venv/bin/activate  # On macOS/Linux
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run the application:**
   ```bash
   python run.py
   ```

The API will be available at `http://localhost:5000`

## API Endpoints

### Health Check
- **GET** `/api/health` - Check API health status
- **GET** `/api` - Get API information

### Authentication Endpoints
Base URL: `/api/auth`

- **POST** `/register` - Register new user
  - Body: `{ username, email, password, full_name }`
  - Response: User object with ID

- **POST** `/login` - Login user
  - Body: `{ username, password }`
  - Response: `{ token, user }`

- **GET** `/profile` - Get current user profile (Auth required)
  - Header: `Authorization: Bearer <token>`
  - Response: User object

- **PUT** `/profile` - Update user profile (Auth required)
  - Body: `{ full_name, phone, wallet_address, profile_image }`
  - Response: Updated user object

- **POST** `/wallet/link` - Link wallet to account (Auth required)
  - Body: `{ wallet_address }`
  - Response: Updated user object

- **POST** `/kyc/verify` - Verify KYC (Auth required)
  - Body: `{ document_url }`
  - Response: Updated user object

- **GET** `/users` - Get all users
  - Query: `page=1&per_page=20`
  - Response: Paginated users list

- **GET** `/user/<user_id>` - Get user by ID
  - Response: User object

### Asset Endpoints
Base URL: `/api/assets`

- **POST** `` - Create new asset (Auth required)
  - Body: `{ name, asset_type, estimated_value, description, condition, serial_number, location }`
  - Response: Created asset object

- **GET** `` - Get all assets
  - Query: `page=1&per_page=20&status=available`
  - Response: Paginated assets list

- **GET** `/my-assets` - Get current user's assets (Auth required)
  - Query: `page=1&per_page=20&status=available`
  - Response: Paginated assets list

- **GET** `/<asset_id>` - Get asset by ID
  - Response: Asset object

- **PUT** `/<asset_id>` - Update asset (Auth required)
  - Body: `{ name, description, estimated_value, condition, location, image_url }`
  - Response: Updated asset object

- **DELETE** `/<asset_id>` - Delete asset (Auth required)
  - Response: Success message

- **POST** `/<asset_id>/pledge` - Pledge asset (Auth required)
  - Body: `{ pledge_amount }`
  - Response: Pledged asset object

- **POST** `/<asset_id>/release` - Release pledged asset (Auth required)
  - Response: Released asset object

### Borrow Endpoints
Base URL: `/api/borrow`

- **POST** `` - Create borrow request (Auth required)
  - Body: `{ asset_id, loan_amount, interest_rate, duration_days, lender_wallet }`
  - Response: Created borrow object

- **GET** `` - Get all borrow records
  - Query: `page=1&per_page=20&status=active`
  - Response: Paginated borrows list

- **GET** `/my-borrows` - Get current user's borrows (Auth required)
  - Query: `page=1&per_page=20&status=active`
  - Response: Paginated borrows list

- **GET** `/<borrow_id>` - Get borrow record by ID
  - Response: Borrow object

- **POST** `/<borrow_id>/approve` - Approve borrow request
  - Response: Approved borrow object

- **POST** `/<borrow_id>/activate` - Activate borrow
  - Body: `{ blockchain_tx_hash }`
  - Response: Activated borrow object

- **POST** `/<borrow_id>/repay` - Repay borrow (Auth required)
  - Body: `{ amount, blockchain_tx_hash }`
  - Response: Updated borrow object

- **POST** `/<borrow_id>/cancel` - Cancel borrow request
  - Response: Cancelled borrow object

- **POST** `/calculate-interest` - Calculate interest
  - Body: `{ loan_amount, interest_rate, duration_days }`
  - Response: `{ loan_amount, interest_rate, duration_days, total_interest, total_amount }`

- **POST** `/check-overdue` - Check for overdue borrows
  - Response: Success message

### Penalty Endpoints
Base URL: `/api/penalties`

- **GET** `` - Get all penalties
  - Query: `page=1&per_page=20&paid=false`
  - Response: Paginated penalties list

- **GET** `/my-penalties` - Get current user's penalties (Auth required)
  - Query: `page=1&per_page=20&paid=false`
  - Response: Paginated penalties list

- **GET** `/<penalty_id>` - Get penalty by ID
  - Response: Penalty object

- **POST** `/<penalty_id>/pay` - Pay penalty (Auth required)
  - Body: `{ amount, blockchain_tx_hash }`
  - Response: Paid penalty object

- **GET** `/pending` - Get all pending penalties
  - Query: `page=1&per_page=20`
  - Response: Paginated penalties list

### User Transaction Endpoints
Base URL: `/api/users`

- **GET** `/<user_id>/transactions` - Get user's transactions
  - Query: `page=1&per_page=20&type=repayment&status=completed`
  - Response: Paginated transactions list

- **GET** `/my-transactions` - Get current user's transactions (Auth required)
  - Query: `page=1&per_page=20&type=repayment&status=completed`
  - Response: Paginated transactions list

- **GET** `/transactions/<transaction_id>` - Get transaction by ID
  - Response: Transaction object

- **GET** `/borrow/<borrow_id>/transactions` - Get borrow transactions
  - Query: `page=1&per_page=20`
  - Response: Paginated transactions list

- **GET** `/transactions` - Get all transactions
  - Query: `page=1&per_page=20&status=completed`
  - Response: Paginated transactions list

### Blockchain Endpoints
Base URL: `/api/blockchain`

- **GET** `/network-info` - Get blockchain network information
  - Response: Network info object

- **POST** `/verify-address` - Verify Ethereum address
  - Body: `{ address }`
  - Response: `{ address, is_valid }`

- **POST** `/verify-signature` - Verify message signature (Auth required)
  - Body: `{ message, signature, address }`
  - Response: `{ is_valid, address }`

- **POST** `/transaction-receipt` - Get transaction receipt
  - Body: `{ tx_hash }`
  - Response: Receipt object with status

- **GET** `/contract-info` - Get smart contract information
  - Response: Contract address and network config

## Data Models

### User
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "wallet_address": "0x123...",
  "full_name": "John Doe",
  "phone": "+1234567890",
  "role": "borrower",
  "kyc_verified": true,
  "is_active": true,
  "total_borrowed": 5000.0,
  "total_lent": 10000.0,
  "credit_score": 85.0,
  "created_at": "2024-01-15T10:00:00",
  "updated_at": "2024-01-15T10:00:00"
}
```

### Asset
```json
{
  "id": 1,
  "owner_id": 1,
  "name": "MacBook Pro",
  "description": "15-inch, 2021 model",
  "asset_type": "electronics",
  "status": "available",
  "estimated_value": 2000.0,
  "condition": "good",
  "image_url": "https://...",
  "qr_code_url": "https://...",
  "serial_number": "ABC123XYZ",
  "location": "New York",
  "pledged_amount": 0.0,
  "created_at": "2024-01-15T10:00:00"
}
```

### Borrow
```json
{
  "id": 1,
  "borrower_id": 1,
  "asset_id": 1,
  "loan_amount": 1500.0,
  "interest_rate": 5.0,
  "duration_days": 30,
  "status": "active",
  "start_date": "2024-01-15T10:00:00",
  "due_date": "2024-02-14T10:00:00",
  "repaid_date": null,
  "repaid_amount": 0.0,
  "total_interest": 6.16,
  "blockchain_tx_hash": "0x123...",
  "created_at": "2024-01-15T10:00:00"
}
```

## Error Responses

All error responses follow this format:
```json
{
  "error": "Error message",
  "details": "Optional detailed error information"
}
```

Common HTTP Status Codes:
- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Authentication

The API uses JWT (JSON Web Token) authentication. To use protected endpoints:

1. Register or login to get a token
2. Include the token in the `Authorization` header: `Authorization: Bearer <token>`
3. Tokens expire after 30 days

## Contributing

1. Follow PEP 8 style guide
2. Write tests for new features
3. Update documentation
4. Commit with descriptive messages

## License

This project is licensed under the MIT License.
