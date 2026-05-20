import sqlite3
import logging
from datetime import datetime, timedelta
from config import Config

logger = logging.getLogger(__name__)

def init_db():
    """Initialize SQLite database with required tables"""
    try:
        conn = sqlite3.connect(Config.DATABASE_PATH)
        cursor = conn.cursor()
        
        # Create metrics history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS metrics_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                cpu_percentage REAL,
                memory_percentage REAL,
                disk_percentage REAL,
                network_sent INTEGER,
                network_recv INTEGER,
                processes_count INTEGER
            )
        ''')
        
        # Create alerts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                type TEXT NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                value REAL,
                threshold REAL
            )
        ''')
        
        # Create thresholds table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS thresholds (
                metric_type TEXT PRIMARY KEY,
                value REAL NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')
        
        # Insert default thresholds if not exist
        default_thresholds = [
            ('cpu', Config.CPU_ALERT_THRESHOLD),
            ('memory', Config.MEMORY_ALERT_THRESHOLD),
            ('disk', Config.DISK_ALERT_THRESHOLD)
        ]
        
        for metric_type, value in default_thresholds:
            cursor.execute('''
                INSERT OR IGNORE INTO thresholds (metric_type, value, updated_at)
                VALUES (?, ?, ?)
            ''', (metric_type, value, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        logger.info("Database initialized successfully")
        
    except Exception as e:
        logger.error(f"Error initializing database: {e}")

def store_metrics(metrics):
    """Store current metrics in database"""
    try:
        conn = sqlite3.connect(Config.DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO metrics_history (
                timestamp, cpu_percentage, memory_percentage, disk_percentage,
                network_sent, network_recv, processes_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            metrics['timestamp'],
            metrics['cpu']['percentage'],
            metrics['memory']['percentage'],
            metrics['disk']['percentage'],
            metrics['network']['bytes_sent'],
            metrics['network']['bytes_recv'],
            metrics['processes']
        ))
        
        conn.commit()
        conn.close()
        logger.debug("Metrics stored successfully")
        
    except Exception as e:
        logger.error(f"Error storing metrics: {e}")

def get_historical_metrics(hours=24):
    """Get historical metrics for the last N hours"""
    try:
        conn = sqlite3.connect(Config.DATABASE_PATH)
        cursor = conn.cursor()
        
        since_time = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        cursor.execute('''
            SELECT timestamp, cpu_percentage, memory_percentage, disk_percentage
            FROM metrics_history
            WHERE timestamp >= ?
            ORDER BY timestamp ASC
        ''', (since_time,))
        
        rows = cursor.fetchall()
        conn.close()
        
        history = []
        for row in rows:
            history.append({
                'timestamp': row[0],
                'cpu': row[1],
                'memory': row[2],
                'disk': row[3]
            })
        
        return history
        
    except Exception as e:
        logger.error(f"Error getting historical metrics: {e}")
        return []

def cleanup_old_metrics():
    """Remove metrics older than retention period"""
    try:
        conn = sqlite3.connect(Config.DATABASE_PATH)
        cursor = conn.cursor()
        
        cutoff_date = (datetime.now() - timedelta(days=Config.HISTORY_RETENTION_DAYS)).isoformat()
        
        cursor.execute('DELETE FROM metrics_history WHERE timestamp < ?', (cutoff_date,))
        cursor.execute('DELETE FROM alerts WHERE timestamp < ?', (cutoff_date,))
        
        conn.commit()
        conn.close()
        logger.info(f"Cleaned up metrics older than {Config.HISTORY_RETENTION_DAYS} days")
        
    except Exception as e:
        logger.error(f"Error cleaning up old metrics: {e}")