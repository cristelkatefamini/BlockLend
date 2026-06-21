# BlockLend Backend

## Quick Start

### 1. Setup Virtual Environment
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
# or
source .venv/bin/activate  # macOS/Linux
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your settings
```

### 4. Run the Server
```bash
python run.py
```

Server will be available at: `http://localhost:5000`

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

## Project Structure

```
backend/
├── app/                    # Main Flask application
│   ├── __init__.py
│   ├── app.py             # Flask app factory
│   ├── config/            # Configuration files
│   │   ├── settings.py
│   │   ├── database.py
│   │   ├── blockchain.py
│   │   └── cloudinary.py
│   ├── models/            # Database models
│   │   ├── user.py
│   │   └── __init__.py
│   ├── routes/            # API endpoints
│   │   ├── auth.py
│   │   ├── assets.py
│   │   ├── borrow.py
│   │   ├── penalties.py
│   │   ├── users.py
│   │   ├── blockchain.py
│   │   └── __init__.py
│   ├── services/          # Business logic
│   │   ├── auth_service.py
│   │   ├── asset_service.py
│   │   ├── borrow_service.py
│   │   ├── penalty_service.py
│   │   ├── transaction_service.py
│   │   ├── blockchain_service.py
│   │   └── __init__.py
│   ├── schemas/           # Data validation
│   │   ├── user_schema.py
│   │   ├── asset_schema.py
│   │   ├── borrow_schema.py
│   │   ├── penalty_schema.py
│   │   └── __init__.py
│   ├── middleware/        # Middleware
│   │   ├── auth.py
│   │   └── __init__.py
│   ├── utils/             # Utilities
│   │   ├── hash_utils.py
│   │   ├── qr_generator.py
│   │   ├── validators.py
│   │   └── __init__.py
│   └── __init__.py
├── run.py                 # Development server runner
├── wsgi.py               # Production WSGI entry point
├── requirements.txt      # Python dependencies
├── .env.example          # Environment variables template
├── API_DOCUMENTATION.md  # API documentation
└── README.md            # This file
```

## Key Features

✅ User authentication with JWT tokens
✅ Asset management and pledging
✅ P2P lending platform
✅ Blockchain integration (Web3)
✅ Penalty tracking and management
✅ Transaction history
✅ KYC verification
✅ Wallet linking
✅ QR code generation
✅ Comprehensive error handling

## Database Models

- **User** - User accounts with KYC verification
- **Asset** - Digital assets used as collateral
- **Borrow** - Lending records with terms
- **Transaction** - All financial transactions
- **Penalty** - Late payment penalties
- **DamageReport** - Asset damage reports

## Environment Variables

Key environment variables (see .env.example for full list):

- `FLASK_ENV` - development/production
- `FLASK_DEBUG` - Enable debug mode
- `DATABASE_URL` - SQLite or PostgreSQL connection
- `JWT_SECRET_KEY` - Secret key for JWT tokens
- `BLOCKCHAIN_RPC_URL` - Ethereum RPC endpoint
- `BLOCKCHAIN_CONTRACT_ADDRESS` - Smart contract address
- `CLOUDINARY_*` - Cloudinary configuration

## Testing

To test the API endpoints, you can use:

### Using cURL
```bash
curl -X GET http://localhost:5000/api/health
```

### Using Python requests
```python
import requests
response = requests.get('http://localhost:5000/api/health')
print(response.json())
```

### Using Postman
Import the API endpoints into Postman and test interactively.

## Deployment

### Using Gunicorn (Production)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 wsgi:app
```

### Using Docker
```bash
docker build -t blocklend-backend .
docker run -p 5000:5000 blocklend-backend
```

## Troubleshooting

### Port Already in Use
```bash
# Find process on port 5000
netstat -ano | findstr :5000

# Kill process (Windows)
taskkill /PID <PID> /F
```

### Database Issues
```bash
# Remove old database
rm blocklend.db

# Database will be recreated on next run
python run.py
```

### Import Errors
```bash
# Make sure virtual environment is activated
pip install -r requirements.txt

# If still having issues, reinstall
pip install --force-reinstall -r requirements.txt
```

## Support

For issues or questions, please check:
1. API_DOCUMENTATION.md for endpoint details
2. Error messages and logs
3. Configuration in .env file

## License

MIT License
