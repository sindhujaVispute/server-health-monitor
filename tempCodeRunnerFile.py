import os
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask
from flask_cors import CORS
from config import config

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Load configuration
env = os.environ.get('FLASK_ENV', 'development')
app.config.from_object(config[env])

# Setup logging
def setup_logging():
    """Configure application logging"""
    if not os.path.exists('logs'):
        os.makedirs('logs')
    
    file_handler = RotatingFileHandler(
        app.config['LOG_FILE_PATH'], 
        maxBytes=10485760,  # 10MB
        backupCount=10
    )
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG if app.config['DEBUG'] else logging.INFO)
    
    app.logger.addHandler(file_handler)
    app.logger.addHandler(console_handler)
    app.logger.setLevel(logging.INFO)
    
    app.logger.info('Server Health Monitor starting...')

# Setup logging
setup_logging()

# Initialize database
from monitoring.history import init_db
init_db()

# Import and register blueprints (after app is created)
from api.routes import api_bp
app.register_blueprint(api_bp, url_prefix='/api')

@app.route('/')
def index():
    """Serve the dashboard"""
    from flask import render_template
    return render_template('index.html')

@app.route('/health')
def health():
    """Health check endpoint"""
    from flask import jsonify
    return jsonify({"status": "healthy", "service": "server-health-monitor"})

# Create a function to initialize app-specific components
def initialize_app():
    """Initialize app-specific components"""
    with app.app_context():
        from monitoring.alerts import AlertManager
        # Pre-initialize alert manager
        alert_manager = AlertManager(app.config['DATABASE_PATH'])
        app.config['ALERT_MANAGER'] = alert_manager

# Initialize the app
initialize_app()

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 5000)),
        debug=app.config['DEBUG']
    )