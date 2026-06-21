from models.user import Asset, AssetStatus
from config.database import db
from utils.qr_generator import generate_qr_code, save_qr_code
from utils.validators import validate_positive_number
from datetime import datetime
import os

class AssetService:
    """Asset service"""
    
    @staticmethod
    def create_asset(owner_id, name, asset_type, estimated_value, description=None, 
                     condition=None, serial_number=None, location=None, image_url=None):
        """Create a new asset"""
        if not validate_positive_number(estimated_value):
            raise ValueError("Asset value must be positive")
        
        # Check for duplicate serial number
        if serial_number:
            existing = Asset.query.filter_by(serial_number=serial_number).first()
            if existing:
                raise ValueError("Asset with this serial number already exists")
        
        asset = Asset(
            owner_id=owner_id,
            name=name,
            description=description,
            asset_type=asset_type,
            estimated_value=estimated_value,
            condition=condition or 'good',
            serial_number=serial_number,
            location=location,
            image_url=image_url,
            status=AssetStatus.AVAILABLE
        )
        
        db.session.add(asset)
        db.session.flush()  # Get the asset ID
        
        # Generate QR code
        qr_data = f"asset_{asset.id}_{serial_number or ''}"
        qr_code_path = AssetService._generate_qr(qr_data, asset.id)
        asset.qr_code_url = qr_code_path
        
        db.session.commit()
        return asset
    
    @staticmethod
    def _generate_qr(data, asset_id):
        """Generate QR code for asset"""
        try:
            from config.settings import Config
            qr_folder = Config.QR_CODE_FOLDER
            os.makedirs(qr_folder, exist_ok=True)
            
            filename = f"asset_{asset_id}.png"
            qr_path = os.path.join(qr_folder, filename)
            
            img = generate_qr_code(data)
            img.save(qr_path)
            
            return qr_path
        except Exception as e:
            print(f"QR code generation failed: {str(e)}")
            return None
    
    @staticmethod
    def get_asset(asset_id):
        """Get asset by ID"""
        return Asset.query.get(asset_id)
    
    @staticmethod
    def get_user_assets(user_id, status=None, page=1, per_page=20):
        """Get user's assets"""
        query = Asset.query.filter_by(owner_id=user_id)
        
        if status:
            query = query.filter_by(status=AssetStatus[status.upper()])
        
        return query.paginate(page=page, per_page=per_page)
    
    @staticmethod
    def update_asset(asset_id, data):
        """Update asset"""
        asset = Asset.query.get(asset_id)
        if not asset:
            raise ValueError("Asset not found")
        
        if 'name' in data:
            asset.name = data['name']
        if 'description' in data:
            asset.description = data['description']
        if 'estimated_value' in data:
            if validate_positive_number(data['estimated_value']):
                asset.estimated_value = data['estimated_value']
        if 'condition' in data:
            asset.condition = data['condition']
        if 'location' in data:
            asset.location = data['location']
        if 'image_url' in data:
            asset.image_url = data['image_url']
        
        db.session.commit()
        return asset
    
    @staticmethod
    def pledge_asset(asset_id, pledge_amount):
        """Pledge asset for loan"""
        asset = Asset.query.get(asset_id)
        if not asset:
            raise ValueError("Asset not found")
        
        if asset.status != AssetStatus.AVAILABLE:
            raise ValueError("Asset is not available for pledging")
        
        if pledge_amount > asset.estimated_value:
            raise ValueError("Pledge amount exceeds asset value")
        
        asset.pledged_amount = pledge_amount
        asset.status = AssetStatus.PLEDGED
        
        db.session.commit()
        return asset
    
    @staticmethod
    def release_asset(asset_id):
        """Release pledged asset"""
        asset = Asset.query.get(asset_id)
        if not asset:
            raise ValueError("Asset not found")
        
        asset.pledged_amount = 0
        asset.status = AssetStatus.AVAILABLE
        
        db.session.commit()
        return asset
    
    @staticmethod
    def mark_as_damaged(asset_id):
        """Mark asset as damaged"""
        asset = Asset.query.get(asset_id)
        if not asset:
            raise ValueError("Asset not found")
        
        asset.status = AssetStatus.DAMAGED
        db.session.commit()
        return asset
    
    @staticmethod
    def mark_as_repossessed(asset_id):
        """Mark asset as repossessed"""
        asset = Asset.query.get(asset_id)
        if not asset:
            raise ValueError("Asset not found")
        
        asset.status = AssetStatus.REPOSSESSED
        db.session.commit()
        return asset
    
    @staticmethod
    def delete_asset(asset_id):
        """Delete asset"""
        asset = Asset.query.get(asset_id)
        if not asset:
            raise ValueError("Asset not found")
        
        if asset.status != AssetStatus.AVAILABLE:
            raise ValueError("Cannot delete a pledged or damaged asset")
        
        db.session.delete(asset)
        db.session.commit()
        return True
    
    @staticmethod
    def get_all_assets(page=1, per_page=20, status=None):
        """Get all assets"""
        query = Asset.query
        
        if status:
            query = query.filter_by(status=AssetStatus[status.upper()])
        
        return query.paginate(page=page, per_page=per_page)
