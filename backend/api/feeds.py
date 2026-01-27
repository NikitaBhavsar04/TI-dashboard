from flask import Blueprint, request, jsonify
import collectors.feeds as feeds

bp = Blueprint('feeds', __name__)

@bp.route('/list', methods=['GET'])
def list_feeds():
    result = feeds.get_feeds()
    return jsonify({'feeds': result})