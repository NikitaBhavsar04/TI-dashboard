from flask import Blueprint, jsonify
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
import utils.common as common

bp = Blueprint('feeds', __name__)

@bp.route('/list', methods=['GET'])
def list_feeds():
    """List all available RSS feed URLs from config"""
    try:
        cfg = common.read_yaml("config.yaml")
        feeds = cfg.get("feeds", {}).get("urls", [])
        
        return jsonify({
            'feeds': feeds,
            'count': len(feeds)
        }), 200
    except Exception as e:
        common.logger.error(f"Failed to list feeds: {e}")
        return jsonify({'error': str(e)}), 500
