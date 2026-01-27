from flask import Blueprint, request, jsonify
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
import utils.common as common
import manual_advisory

bp = Blueprint('advisory', __name__)

@bp.route('/generate', methods=['POST'])
def generate_advisory_endpoint():
    """Generate advisory from article ID"""
    try:
        data = request.get_json()
        article_id = data.get('article_id')
        
        if not article_id:
            return jsonify({'error': 'article_id is required'}), 400
        
        result = manual_advisory.generate_advisory(article_id)
        return jsonify({'advisory': result}), 200
    except KeyError as e:
        common.logger.error(f"Article not found: {e}")
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        common.logger.error(f"Advisory generation failed: {e}")
        return jsonify({'error': str(e)}), 500