from marshmallow import Schema, fields, validate

class BorrowCreateSchema(Schema):
    """Borrow creation schema"""
    asset_id = fields.Int(required=True)
    loan_amount = fields.Float(required=True, validate=validate.Range(min=0))
    interest_rate = fields.Float(required=True, validate=validate.Range(min=0, max=100))
    duration_days = fields.Int(required=True, validate=validate.Range(min=1))
    lender_wallet = fields.Str(allow_none=True)

class BorrowUpdateStatusSchema(Schema):
    """Borrow status update schema"""
    status = fields.Str(required=True, validate=validate.OneOf(['approved', 'active', 'cancelled']))

borrow_create_schema = BorrowCreateSchema()
borrow_update_status_schema = BorrowUpdateStatusSchema()
