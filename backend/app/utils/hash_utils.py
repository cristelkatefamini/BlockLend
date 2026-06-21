from werkzeug.security import generate_password_hash, check_password_hash

def hash_password(password):
    """Hash a password"""
    return generate_password_hash(password, method='pbkdf2:sha256')

def verify_password(password_hash, password):
    """Verify a password against its hash"""
    return check_password_hash(password_hash, password)
