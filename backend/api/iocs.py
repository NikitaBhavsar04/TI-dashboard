from flask import Blueprint, request, jsonify
import collectors.iocs as iocs

bp = Blueprint('iocs', __name__)

@bp.route('/extract', methods=['POST'])
def extract_iocs():
    data = request.get_json()
    text = data.get('text')
    result = iocs.extract_iocs(text)
    return jsonify({'iocs': result})