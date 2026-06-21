from marshmallow import Schema, fields, validate

class PenaltyPaymentSchema(Schema):
    """Penalty payment schema"""
    penalty_id = fields.Int(required=True)
    amount = fields.Float(required=True, validate=validate.Range(min=0))
    transaction_hash = fields.Str(allow_none=True)

penalty_payment_schema = PenaltyPaymentSchema()
