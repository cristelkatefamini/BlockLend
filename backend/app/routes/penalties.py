from flask import Blueprint, request, jsonify
from services.penalty_service import PenaltyService
from middleware.auth import token_required

penalties_bp = Blueprint('penalties', __name__, url_prefix='/api/penalties')

@penalties_bp.route('', methods=['GET'])
def get_penalties():
    """Get all penalties"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        paid_status = request.args.get('paid', None)
        
        if paid_status is not None:
            paid_status = paid_status.lower() == 'true'
        
        paginated = PenaltyService.get_pending_penalties(page=page, per_page=per_page) \
            if paid_status is False else PenaltyService.get_all_penalties(page=page, per_page=per_page)
        
        penalties = [penalty.to_dict() for penalty in paginated.items]
        
        return jsonify({
            'penalties': penalties,
            'total': paginated.total,
            'pages': paginated.pages,
            'current_page': page
        }), 200
    
    except Exception as e:
        return jsonify({'error': 'Failed to get penalties', 'details': str(e)}), 500

@penalties_bp.route('/my-penalties', methods=['GET'])
@token_required
def get_my_penalties():
    """Get current user's penalties"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        paid_status = request.args.get('paid', None)
        
        if paid_status is not None:
            paid_status = paid_status.lower() == 'true'
        
        paginated = PenaltyService.get_user_penalties(
            user_id=request.current_user_id,
            paid_status=paid_status,
            page=page,
            per_page=per_page
        )
        
        penalties = [penalty.to_dict() for penalty in paginated.items]
        
        return jsonify({
            'penalties': penalties,
            'total': paginated.total,
            'pages': paginated.pages,
            'current_page': page
        }), 200
    
    except Exception as e:
        return jsonify({'error': 'Failed to get penalties', 'details': str(e)}), 500

@penalties_bp.route('/<int:penalty_id>', methods=['GET'])
def get_penalty(penalty_id):
    """Get penalty by ID"""
    try:
        penalty = PenaltyService.get_penalty(penalty_id)
        
        if not penalty:
            return jsonify({'error': 'Penalty not found'}), 404
        
        return jsonify({'penalty': penalty.to_dict()}), 200
    
    except Exception as e:
        return jsonify({'error': 'Failed to get penalty', 'details': str(e)}), 500

@penalties_bp.route('/<int:penalty_id>/pay', methods=['POST'])
@token_required
def pay_penalty(penalty_id):
    """Pay a penalty"""
    try:
        data = request.get_json()
        amount = data.get('amount')
        blockchain_tx_hash = data.get('blockchain_tx_hash')
        
        if not amount:
            return jsonify({'error': 'Amount is required'}), 400
        
        penalty = PenaltyService.pay_penalty(penalty_id, amount, blockchain_tx_hash)
        
        return jsonify({
            'message': 'Penalty paid successfully',
            'penalty': penalty.to_dict()
        }), 200
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to pay penalty', 'details': str(e)}), 500

@penalties_bp.route('/pending', methods=['GET'])
def get_pending_penalties():
    """Get all pending penalties"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        paginated = PenaltyService.get_pending_penalties(page=page, per_page=per_page)
        
        penalties = [penalty.to_dict() for penalty in paginated.items]
        
        return jsonify({
            'penalties': penalties,
            'total': paginated.total,
            'pages': paginated.pages,
            'current_page': page
        }), 200
    
    except Exception as e:
        return jsonify({'error': 'Failed to get pending penalties', 'details': str(e)}), 500
