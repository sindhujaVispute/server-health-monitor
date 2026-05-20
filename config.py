import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    DATABASE_PATH = os.environ.get('DATABASE_PATH', 'data/metrics.db')
    LOG_FILE_PATH = os.environ.get('LOG_FILE_PATH', 'logs/app.log')
    METRICS_REFRESH_INTERVAL = int(os.environ.get('METRICS_REFRESH_INTERVAL', 2))
    HISTORY_RETENTION_DAYS = int(os.environ.get('HISTORY_RETENTION_DAYS', 7))
    
    # Alert thresholds
    CPU_ALERT_THRESHOLD = float(os.environ.get('CPU_ALERT_THRESHOLD', 80.0))
    MEMORY_ALERT_THRESHOLD = float(os.environ.get('MEMORY_ALERT_THRESHOLD', 80.0))
    DISK_ALERT_THRESHOLD = float(os.environ.get('DISK_ALERT_THRESHOLD', 85.0))
    
    # API settings
    API_TITLE = "Server Health Monitor API"
    API_VERSION = "v1"
    
class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False
    
class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    
class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = False
    TESTING = True
    DATABASE_PATH = 'data/test.db'

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}