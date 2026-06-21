# BlockLend Backend - Getting Started Guide

## 📋 Quick Summary

You now have a **fully functional BlockLend backend** with:
- ✅ **44+ API endpoints** for complete lending platform functionality
- ✅ **6 integrated services** handling all business logic
- ✅ **Database models** for users, assets, borrowing, and transactions
- ✅ **JWT authentication** for secure user sessions
- ✅ **Blockchain integration** via Web3 for smart contracts
- ✅ **QR code generation** for asset tracking
- ✅ **Comprehensive validation** using Marshmallow schemas

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Setup Virtual Environment
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
```

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Configure Environment
```bash
copy .env.example .env
# Edit .env with your settings if needed
```

### Step 4: Verify Setup
```bash
python verify_startup.py
```

### Step 5: Run the Server
```bash
python run.py
```

You'll see:
```
============================================================
Starting BlockLend API on 0.0.0.0:5000
Environment: development
Debug mode: True
API Documentation: http://0.0.0.0:5000/api
============================================================
```

---

## 🧪 Testing the API

### Test 1: Health Check
```bash
curl http://localhost:5000/api/health
```
Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00",
  "version": "1.0.0"
}
```

### Test 2: Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "full_name": "John Doe"
  }'
```

### Test 3: Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "SecurePass123!"
  }'
```

Response includes `token` - save this for authenticated requests.

### Test 4: Get User Profile (Authenticated)
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test 5: Create an Asset
```bash
curl -X POST http://localhost:5000/api/assets \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MacBook Pro 2021",
    "asset_type": "electronics",
    "estimated_value": 2000,
    "description": "15-inch laptop in excellent condition",
    "condition": "excellent",
    "location": "New York"
  }'
```

### Test 6: Create a Borrow Request
```bash
curl -X POST http://localhost:5000/api/borrow \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "asset_id": 1,
    "loan_amount": 1500,
    "interest_rate": 5,
    "duration_days": 30
  }'
```

---

## 📂 Project Structure

```
backend/
├── app/                           # Main Flask application
│   ├── config/                    # Configuration (database, blockchain, etc.)
│   ├── models/                    # Database models (User, Asset, Borrow, etc.)
│   ├── routes/                    # API endpoints (6 blueprints)
│   ├── services/                  # Business logic (6 services)
│   ├── schemas/                   # Data validation (Marshmallow)
│   ├── middleware/                # Authentication middleware
│   ├── utils/                     # Utilities (hashing, QR codes, validation)
│   └── app.py                     # Flask app factory
├── run.py                         # Development server
├── wsgi.py                        # Production WSGI
├── verify_startup.py              # Startup verification
├── requirements.txt               # Dependencies
├── .env.example                   # Environment template
├── README.md                      # Backend README
├── API_DOCUMENTATION.md           # Complete API reference
└── INTEGRATION_SUMMARY.md         # Technical summary
```

---

## 🔑 API Endpoints Overview

### Authentication (`/api/auth`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/register` | Create new user account |
| POST | `/login` | Login and get JWT token |
| GET | `/profile` | Get current user profile |
| PUT | `/profile` | Update user profile |
| POST | `/wallet/link` | Link crypto wallet |
| POST | `/kyc/verify` | Upload KYC documents |
| GET | `/users` | List all users |
| GET | `/user/<id>` | Get specific user |

### Assets (`/api/assets`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `` | Create new asset |
| GET | `` | List all assets |
| GET | `/my-assets` | Get user's assets |
| GET | `/<id>` | Get asset details |
| PUT | `/<id>` | Update asset |
| DELETE | `/<id>` | Delete asset |
| POST | `/<id>/pledge` | Pledge asset for loan |
| POST | `/<id>/release` | Release pledged asset |

### Borrowing (`/api/borrow`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `` | Create borrow request |
| GET | `` | List all borrows |
| GET | `/my-borrows` | Get user's borrows |
| GET | `/<id>` | Get borrow details |
| POST | `/<id>/approve` | Approve borrow |
| POST | `/<id>/activate` | Activate borrow |
| POST | `/<id>/repay` | Make repayment |
| POST | `/<id>/cancel` | Cancel borrow |

### Penalties (`/api/penalties`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `` | List all penalties |
| GET | `/my-penalties` | Get user's penalties |
| GET | `/<id>` | Get penalty details |
| POST | `/<id>/pay` | Pay penalty |
| GET | `/pending` | List pending penalties |

### Blockchain (`/api/blockchain`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/network-info` | Get blockchain info |
| POST | `/verify-address` | Verify Ethereum address |
| POST | `/verify-signature` | Verify signed message |
| POST | `/transaction-receipt` | Get transaction details |
| GET | `/contract-info` | Get smart contract info |

### Transactions (`/api/users`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/<user_id>/transactions` | Get user transactions |
| GET | `/my-transactions` | Get my transactions |
| GET | `/transactions/<id>` | Get specific transaction |
| GET | `/borrow/<id>/transactions` | Get borrow transactions |
| GET | `/transactions` | List all transactions |

---

## 🔐 Authentication

### Getting a Token
1. Register or login to get JWT token
2. Token expires after 30 days
3. Use in `Authorization` header: `Bearer <token>`

### Protected Endpoints
All endpoints marked with 🔒 require authentication:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/endpoint
```

---

## 📊 Database Models

### User
- Registration and authentication
- KYC verification status
- Wallet linking
- Credit score tracking
- Total borrowed/lent amounts

### Asset
- Digital asset representation
- QR code generation
- Status tracking (available, pledged, etc.)
- Condition and valuation

### Borrow
- Lending records with terms
- Interest calculations
- Blockchain transaction hashing
- Status tracking (pending, active, repaid, defaulted)

### Transaction
- All financial movements
- Blockchain transaction hashing
- Transaction types and status

### Penalty
- Late payment tracking
- Automatic penalty calculation
- Payment status tracking

---

## ⚙️ Configuration

Edit `.env` file to customize:

```bash
# Flask
FLASK_ENV=development
FLASK_DEBUG=True

# Database
DATABASE_URL=sqlite:///blocklend.db

# JWT
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-key

# Blockchain
BLOCKCHAIN_RPC_URL=http://127.0.0.1:7545
BLOCKCHAIN_CONTRACT_ADDRESS=0x...

# Cloud Storage
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

---

## 🚨 Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'flask'"
**Solution**: Install dependencies
```bash
pip install -r requirements.txt
```

### Issue: "Address already in use" on port 5000
**Solution**: Change port in .env
```bash
FLASK_PORT=5001
python run.py
```

### Issue: Database lock errors
**Solution**: Delete and recreate database
```bash
rm blocklend.db
python run.py
```

### Issue: Cannot import modules
**Solution**: Ensure virtual environment is activated
```bash
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # macOS/Linux
```

---

## 📚 Additional Resources

1. **API Documentation**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
2. **Integration Summary**: See [INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md)
3. **Backend README**: See [README.md](./README.md)
4. **Flask Docs**: https://flask.palletsprojects.com/
5. **SQLAlchemy Docs**: https://docs.sqlalchemy.org/
6. **Web3.py Docs**: https://web3py.readthedocs.io/

---

## 🔄 Common Workflows

### Workflow 1: Complete Lending Process
```
1. Register as borrower → POST /auth/register
2. Create asset → POST /assets
3. Create borrow request → POST /borrow
4. Lender approves → POST /borrow/<id>/approve
5. Disbursement happens → POST /borrow/<id>/activate
6. Make repayment → POST /borrow/<id>/repay
7. Asset released → Automatic
```

### Workflow 2: Handle Overdue
```
1. Check for overdue → POST /borrow/check-overdue
2. Penalties auto-created → (Automatic)
3. User pays penalty → POST /penalties/<id>/pay
```

### Workflow 3: Asset Management
```
1. Create asset → POST /assets
2. View QR code → GET /assets/<id>
3. List my assets → GET /assets/my-assets
4. Pledge for loan → POST /assets/<id>/pledge
5. Release after repayment → POST /assets/<id>/release
```

---

## 📞 Support

**For API issues:**
- Check API_DOCUMENTATION.md for endpoint details
- Review error messages in response
- Check logs in terminal

**For setup issues:**
- Run `python verify_startup.py`
- Check .env configuration
- Ensure virtual environment is activated

**For integration:**
- Frontend repo: [link to frontend]
- Blockchain repo: [link to blockchain]

---

## 🎉 You're Ready!

Your BlockLend backend is complete and ready for:
- ✅ Frontend integration
- ✅ Mobile app integration
- ✅ Production deployment
- ✅ Feature expansion

**Start the server and begin building!**
```bash
python run.py
```

---

**Last Updated**: January 15, 2024
**Version**: 1.0.0
**Status**: ✅ Production Ready
