import qrcode
import io
from pathlib import Path

def generate_qr_code(data, size=10):
    """Generate QR code image"""
    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=size,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        return img
    except Exception as e:
        raise Exception(f"QR code generation failed: {str(e)}")

def save_qr_code(data, filename, filepath):
    """Generate and save QR code"""
    try:
        img = generate_qr_code(data)
        Path(filepath).mkdir(parents=True, exist_ok=True)
        full_path = Path(filepath) / filename
        img.save(full_path)
        return str(full_path)
    except Exception as e:
        raise Exception(f"QR code save failed: {str(e)}")

def qr_code_to_bytes(data):
    """Generate QR code as bytes"""
    try:
        img = generate_qr_code(data)
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        return img_bytes
    except Exception as e:
        raise Exception(f"QR code to bytes conversion failed: {str(e)}")
