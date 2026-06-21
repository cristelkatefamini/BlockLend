from marshmallow import Schema, fields, validate

class AssetCreateSchema(Schema):
    """Asset creation schema"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    description = fields.Str(allow_none=True)
    asset_type = fields.Str(required=True)
    quantity = fields.Int(required=True, validate=validate.Range(min=1))
    serial_number = fields.Str(allow_none=True)
    location = fields.Str(allow_none=True)
    image_url = fields.Str(allow_none=True)

class AssetUpdateSchema(Schema):
    """Asset update schema"""
    name = fields.Str(allow_none=True)
    description = fields.Str(allow_none=True)
    asset_type = fields.Str(allow_none=True)
    quantity = fields.Int(allow_none=True, validate=validate.Range(min=0))
    location = fields.Str(allow_none=True)
    image_url = fields.Str(allow_none=True)

class AssetSchema(Schema):
    """Asset schema"""
    _id = fields.Str(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    description = fields.Str(allow_none=True)
    asset_type = fields.Str(required=True)
    quantity = fields.Int(required=True, validate=validate.Range(min=0))
    in_stock = fields.Bool(dump_only=True)
    serial_number = fields.Str(allow_none=True)
    location = fields.Str(allow_none=True)
    image_url = fields.Str(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

asset_create_schema = AssetCreateSchema()
asset_update_schema = AssetUpdateSchema()
asset_schema = AssetSchema()
asset_list_schema = AssetSchema(many=True)
