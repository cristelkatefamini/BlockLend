from marshmallow import Schema, fields, validate, ValidationError

class UserSchema(Schema):
    """User schema for serialization"""
    id = fields.Int(dump_only=True)
    username = fields.Str(required=True, validate=validate.Length(min=3, max=80))
    email = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True, validate=validate.Length(min=8))
    full_name = fields.Str(allow_none=True)
    phone = fields.Str(allow_none=True)
    wallet_address = fields.Str(allow_none=True)
    profile_image = fields.Str(allow_none=True, dump_only=True)
    role = fields.Str(dump_only=True)
    kyc_verified = fields.Bool(dump_only=True)
    is_active = fields.Bool(dump_only=True)
    total_borrowed = fields.Float(dump_only=True)
    total_lent = fields.Float(dump_only=True)
    credit_score = fields.Float(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class UserLoginSchema(Schema):
    """User login schema"""
    username = fields.Str(required=True)
    password = fields.Str(required=True)

class UserProfileUpdateSchema(Schema):
    """User profile update schema"""
    full_name = fields.Str(allow_none=True)
    phone = fields.Str(allow_none=True)
    wallet_address = fields.Str(allow_none=True)
    profile_image = fields.Str(allow_none=True)

class AssetSchema(Schema):
    """Asset schema"""
    id = fields.Int(dump_only=True)
    owner_id = fields.Int(required=True)
    name = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    description = fields.Str(allow_none=True)
    asset_type = fields.Str(required=True)
    status = fields.Str(dump_only=True)
    estimated_value = fields.Float(required=True, validate=validate.Range(min=0))
    condition = fields.Str(allow_none=True)
    image_url = fields.Str(allow_none=True, dump_only=True)
    qr_code_url = fields.Str(allow_none=True, dump_only=True)
    serial_number = fields.Str(allow_none=True)
    location = fields.Str(allow_none=True)
    pledged_amount = fields.Float(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class BorrowSchema(Schema):
    """Borrow schema"""
    id = fields.Int(dump_only=True)
    borrower_id = fields.Int(required=True)
    asset_id = fields.Int(required=True)
    loan_amount = fields.Float(required=True, validate=validate.Range(min=0))
    interest_rate = fields.Float(required=True, validate=validate.Range(min=0))
    duration_days = fields.Int(required=True, validate=validate.Range(min=1))
    status = fields.Str(dump_only=True)
    start_date = fields.DateTime(allow_none=True, dump_only=True)
    due_date = fields.DateTime(allow_none=True, dump_only=True)
    repaid_date = fields.DateTime(allow_none=True, dump_only=True)
    repaid_amount = fields.Float(dump_only=True)
    total_interest = fields.Float(allow_none=True, dump_only=True)
    blockchain_tx_hash = fields.Str(allow_none=True, dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class BorrowRepaySchema(Schema):
    """Borrow repayment schema"""
    borrow_id = fields.Int(required=True)
    amount = fields.Float(required=True, validate=validate.Range(min=0))
    transaction_hash = fields.Str(allow_none=True)

class TransactionSchema(Schema):
    """Transaction schema"""
    id = fields.Int(dump_only=True)
    user_id = fields.Int(required=True)
    borrow_id = fields.Int(allow_none=True)
    transaction_type = fields.Str(required=True)
    amount = fields.Float(required=True, validate=validate.Range(min=0))
    status = fields.Str(dump_only=True)
    blockchain_tx_hash = fields.Str(allow_none=True, dump_only=True)
    description = fields.Str(allow_none=True)
    created_at = fields.DateTime(dump_only=True)

class PenaltySchema(Schema):
    """Penalty schema"""
    id = fields.Int(dump_only=True)
    user_id = fields.Int(required=True)
    borrow_id = fields.Int(required=True)
    penalty_amount = fields.Float(dump_only=True)
    penalty_reason = fields.Str(dump_only=True)
    days_overdue = fields.Int(dump_only=True)
    is_paid = fields.Bool(dump_only=True)
    paid_date = fields.DateTime(allow_none=True, dump_only=True)
    created_at = fields.DateTime(dump_only=True)

class DamageReportSchema(Schema):
    """Damage report schema"""
    id = fields.Int(dump_only=True)
    asset_id = fields.Int(required=True)
    reported_by_id = fields.Int(dump_only=True)
    description = fields.Str(required=True)
    severity = fields.Str(required=True, validate=validate.OneOf(['minor', 'moderate', 'severe']))
    image_url = fields.Str(allow_none=True, dump_only=True)
    is_resolved = fields.Bool(dump_only=True)
    resolution = fields.Str(allow_none=True)
    created_at = fields.DateTime(dump_only=True)

# Schema instances
user_schema = UserSchema()
user_list_schema = UserSchema(many=True)
user_login_schema = UserLoginSchema()
user_profile_update_schema = UserProfileUpdateSchema()
asset_schema = AssetSchema()
asset_list_schema = AssetSchema(many=True)
borrow_schema = BorrowSchema()
borrow_list_schema = BorrowSchema(many=True)
borrow_repay_schema = BorrowRepaySchema()
transaction_schema = TransactionSchema()
transaction_list_schema = TransactionSchema(many=True)
penalty_schema = PenaltySchema()
penalty_list_schema = PenaltySchema(many=True)
damage_report_schema = DamageReportSchema()
damage_report_list_schema = DamageReportSchema(many=True)
