from flask import Blueprint, request, jsonify
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
import utils.common as common
from collectors.iocs import extract_iocs

bp = Blueprint('iocs', __name__)

@bp.route('/extract-from-text', methods=['POST'])
def extract_iocs_from_text():
    """Extract IOCs (IPv4, IPv6, domains, URLs, hashes) from text"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'text field is required'}), 400
        
        iocs = extract_iocs(text)
        
        return jsonify({'iocs': iocs}), 200
    except Exception as e:
        common.logger.error(f"IOC extraction failed: {e}")
        return jsonify({'error': str(e)}), 500
