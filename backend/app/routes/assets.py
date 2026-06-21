from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from bson.objectid import ObjectId
from datetime import datetime
from typing import Optional
from config.database import database
from middleware.auth import get_current_user
from config.cloudinary import init_cloudinary
import cloudinary.uploader

router = APIRouter(prefix="/api/assets", tags=["assets"])

# Get all assets with optional filtering
@router.get("")
async def get_assets(
    asset_type: str = None,
    search: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all assets with optional filtering by asset_type and search term"""
    try:
        query = {}
        
        if asset_type and asset_type != "all":
            query["asset_type"] = asset_type
        
        if search:
            query["name"] = {"$regex": search, "$options": "i"}
        
        assets_collection = database.get_collection("assets")
        assets = list(assets_collection.find(query))
        
        # Convert ObjectId to string for JSON serialization and add default fields
        for asset in assets:
            asset["_id"] = str(asset["_id"])
            # Add default quantity and in_stock if missing (for backward compatibility)
            if "quantity" not in asset:
                asset["quantity"] = 1
            if "in_stock" not in asset:
                asset["in_stock"] = asset.get("quantity", 1) > 0
        
        return {
            "success": True,
            "data": assets,
            "count": len(assets)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get single asset by ID
@router.get("/{asset_id}")
async def get_asset(
    asset_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific asset by ID"""
    try:
        if not ObjectId.is_valid(asset_id):
            raise HTTPException(status_code=400, detail="Invalid asset ID")
        
        assets_collection = database.get_collection("assets")
        asset = assets_collection.find_one({"_id": ObjectId(asset_id)})
        
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        asset["_id"] = str(asset["_id"])
        # Add default quantity and in_stock if missing (for backward compatibility)
        if "quantity" not in asset:
            asset["quantity"] = 1
        if "in_stock" not in asset:
            asset["in_stock"] = asset.get("quantity", 1) > 0
        
        return {
            "success": True,
            "data": asset
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Create new asset (admin only)
@router.post("")
async def create_asset(
    name: str = Form(...),
    asset_type: str = Form(...),
    quantity: int = Form(...),
    description: str = Form(None),
    serial_number: str = Form(None),
    location: str = Form(None),
    image: UploadFile = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Create a new asset (admin only)"""
    try:
        # Check if user is admin
        user_role = current_user.get("role") or current_user.get("user_role")
        if user_role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can create assets")
        
        image_url = None
        
        # Upload image to Cloudinary if provided
        if image:
            try:
                init_cloudinary()
                file_content = await image.read()
                result = cloudinary.uploader.upload(
                    file_content,
                    folder="blocklend/assets",
                    resource_type="auto"
                )
                image_url = result.get("secure_url")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Image upload failed: {str(e)}")
        
        quantity = int(quantity)
        
        asset = {
            "name": name,
            "asset_type": asset_type,
            "description": description,
            "quantity": quantity,
            "in_stock": quantity > 0,
            "serial_number": serial_number,
            "location": location,
            "image_url": image_url,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        assets_collection = database.get_collection("assets")
        result = assets_collection.insert_one(asset)
        
        asset["_id"] = str(result.inserted_id)
        return {
            "success": True,
            "message": "Asset created successfully",
            "data": asset
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Update asset (admin only)
@router.put("/{asset_id}")
async def update_asset(
    asset_id: str,
    name: Optional[str] = Form(None),
    asset_type: Optional[str] = Form(None),
    quantity: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    serial_number: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Update an asset (admin only)"""
    try:
        # Check if user is admin
        user_role = current_user.get("role") or current_user.get("user_role")
        if user_role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can update assets")
        
        if not ObjectId.is_valid(asset_id):
            raise HTTPException(status_code=400, detail="Invalid asset ID")
        
        update_data = {}
        
        # Only add fields that are explicitly provided and normalize empty values safely.
        if name is not None:
            normalized_name = name.strip()
            if normalized_name:
                update_data["name"] = normalized_name
        if asset_type is not None:
            normalized_asset_type = asset_type.strip()
            if normalized_asset_type:
                update_data["asset_type"] = normalized_asset_type
        if description is not None:
            update_data["description"] = description.strip() or None
        if location is not None:
            update_data["location"] = location.strip() or None
        if serial_number is not None:
            update_data["serial_number"] = serial_number.strip() or None
        if quantity is not None:
            quantity = int(quantity)
            update_data["quantity"] = quantity
            update_data["in_stock"] = quantity > 0
        
        # Handle image upload
        if image:
            try:
                init_cloudinary()
                file_content = await image.read()
                result = cloudinary.uploader.upload(
                    file_content,
                    folder="blocklend/assets",
                    resource_type="auto"
                )
                update_data["image_url"] = result.get("secure_url")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Image upload failed: {str(e)}")
        
        # If no fields to update, return error
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        update_data["updated_at"] = datetime.utcnow()
        
        assets_collection = database.get_collection("assets")
        result = assets_collection.find_one_and_update(
            {"_id": ObjectId(asset_id)},
            {"$set": update_data},
            return_document=True
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        result["_id"] = str(result["_id"])
        return {
            "success": True,
            "message": "Asset updated successfully",
            "data": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Delete asset (admin only)
@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an asset (admin only)"""
    try:
        # Check if user is admin - handle both field name variations
        user_role = current_user.get("role") or current_user.get("user_role")
        if user_role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can delete assets")
        
        if not ObjectId.is_valid(asset_id):
            raise HTTPException(status_code=400, detail="Invalid asset ID")
        
        assets_collection = database.get_collection("assets")
        result = assets_collection.delete_one({"_id": ObjectId(asset_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        return {
            "success": True,
            "message": "Asset deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
