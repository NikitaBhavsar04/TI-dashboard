from flask import Flask, jsonify
from flask_cors import CORS
import os
import importlib.util
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['ENV'] = os.getenv('FLASK_ENV', 'development')
app.config['DEBUG'] = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
app.config['JSON_SORT_KEYS'] = False
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False

# CORS Configuration
if app.config['ENV'] == 'production':
    # Production: Restrict CORS to specific origins
    allowed_origins = os.getenv('CORS_ORIGINS', '').split(',')
    CORS(app, origins=allowed_origins if allowed_origins[0] else ['*'])
else:
    # Development: Allow all origins
    CORS(app)

# Health check endpoint (required for load balancers)
@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint for monitoring"""
    return jsonify({
        'status': 'healthy',
        'service': 'threat-advisory-api',
        'version': '1.0.0'
    }), 200

# Dynamically register all blueprints in routes/
routes_dir = os.path.join(os.path.dirname(__file__), 'routes')
for filename in os.listdir(routes_dir):
    if filename.endswith('.py') and filename != '__init__.py':
        module_name = f"api.routes.{filename[:-3]}"
        spec = importlib.util.spec_from_file_location(module_name, os.path.join(routes_dir, filename))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        if hasattr(module, 'bp'):
            app.register_blueprint(module.bp, url_prefix=f"/api/{filename[:-3]}")

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == "__main__":
    # Development server only
    port = int(os.getenv('PORT', 8000))
    app.run(host="0.0.0.0", port=port, debug=app.config['DEBUG'])