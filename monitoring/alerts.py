import sqlite3
import logging
from datetime import datetime
from config import Config

logger = logging.getLogger(__name__)

class AlertManager:
    """Manage system alerts and thresholds"""
    
    def __init__(self, db_path):
        self.db_path = db_path
        self.thresholds = {
            'cpu': Config.CPU_ALERT_THRESHOLD,
            'memory': Config.MEMORY_ALERT_THRESHOLD,
            'disk': Config.DISK_ALERT_THRESHOLD
        }
    
    def check_alerts(self, metrics):
        """Check metrics against thresholds and create alerts"""
        alerts = []
        
        # Check CPU alert
        if metrics['cpu']['percentage'] > self.thresholds['cpu']:
            alerts.append({
                'type': 'CPU',
                'severity': 'warning',
                'message': f"CPU usage is at {metrics['cpu']['percentage']}% (threshold: {self.thresholds['cpu']}%)",
                'value': metrics['cpu']['percentage'],
                'threshold': self.thresholds['cpu']
            })
        
        # Check memory alert
        if metrics['memory']['percentage'] > self.thresholds['memory']:
            alerts.append({
                'type': 'Memory',
                'severity': 'warning',
                'message': f"Memory usage is at {metrics['memory']['percentage']}% (threshold: {self.thresholds['memory']}%)",
                'value': metrics['memory']['percentage'],
                'threshold': self.thresholds['memory']
            })
        
        # Check disk alert
        if metrics['disk']['percentage'] > self.thresholds['disk']:
            alerts.append({
                'type': 'Disk',
                'severity': 'critical',
                'message': f"Disk usage is at {metrics['disk']['percentage']}% (threshold: {self.thresholds['disk']}%)",
                'value': metrics['disk']['percentage'],
                'threshold': self.thresholds['disk']
            })
        
        # Store alerts in database
        for alert in alerts:
            self.store_alert(alert)
        
        return alerts
    
    def store_alert(self, alert):
        """Store alert in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO alerts (timestamp, type, severity, message, value, threshold)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                datetime.now().isoformat(),
                alert['type'],
                alert['severity'],
                alert['message'],
                alert['value'],
                alert['threshold']
            ))
            conn.commit()
            conn.close()
            logger.info(f"Alert stored: {alert['type']} - {alert['message']}")
        except Exception as e:
            logger.error(f"Error storing alert: {e}")
    
    def get_recent_alerts(self, limit=50):
        """Get recent alerts from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                SELECT timestamp, type, severity, message, value, threshold
                FROM alerts
                ORDER BY timestamp DESC
                LIMIT ?
            ''', (limit,))
            rows = cursor.fetchall()
            conn.close()
            
            alerts = []
            for row in rows:
                alerts.append({
                    'timestamp': row[0],
                    'type': row[1],
                    'severity': row[2],
                    'message': row[3],
                    'value': row[4],
                    'threshold': row[5]
                })
            return alerts
        except Exception as e:
            logger.error(f"Error getting recent alerts: {e}")
            return []
    
    def update_threshold(self, metric_type, value):
        """Update alert threshold for a metric type"""
        if metric_type in self.thresholds:
            self.thresholds[metric_type] = float(value)
            logger.info(f"Updated {metric_type} threshold to {value}")
            return True
        return False
    
    def get_thresholds(self):
        """Get current thresholds"""
        return self.thresholds