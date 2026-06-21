import re
from email_validator import validate_email, EmailNotValidError

def validate_email_format(email):
    """Validate email format"""
    try:
        validate_email(email)
        return True
    except EmailNotValidError:
        return False

def validate_username(username):
    """Validate username format"""
    if not username or len(username) < 3 or len(username) > 80:
        return False
    if not re.match("^[a-zA-Z0-9_-]+$", username):
        return False
    return True

def validate_password(password):
    """Validate password strength"""
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain lowercase letters"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain uppercase letters"
    if not re.search(r"\d", password):
        return False, "Password must contain numbers"
    return True, "Password is valid"

def validate_ethereum_address(address):
    """Validate Ethereum address format"""
    if not address:
        return False
    return bool(re.match(r"^0x[a-fA-F0-9]{40}$", address))

def validate_positive_number(value, min_value=0):
    """Validate positive number"""
    try:
        num = float(value)
        return num > min_value
    except (ValueError, TypeError):
        return False
