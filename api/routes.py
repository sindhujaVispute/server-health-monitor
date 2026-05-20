from flask import Blueprint, request, jsonify, current_app
from monitoring.metrics import SystemMetrics
from monitoring.alerts import AlertManager
from monitoring.history import store_metrics, get_historical_metrics, cleanup_old_metrics
import logging

api_bp = Blueprint('api', __name__)
logger = logging.getLogger(__name__)

# Don't initialize AlertManager here - will be initialized with app context
alert_manager = None

def get_alert_manager():
    """Get or create AlertManager with app context"""
    global alert_manager
    if alert_manager is None:
        with current_app.app_context():
            alert_manager = AlertManager(current_app.config['DATABASE_PATH'])
    return alert_manager

@api_bp.route('/metrics/current', methods=['GET'])
def get_current_metrics():
    """Get current system metrics"""
    try:
        metrics = SystemMetrics.get_all_metrics()
        
        # Store metrics in database
        store_metrics(metrics)
        
        # Check for alerts
        alerts = get_alert_manager().check_alerts(metrics)
        
        # Clean up old metrics periodically (every 10 requests)
        import random
        if random.randint(1, 10) == 1:
            cleanup_old_metrics()
        
        return jsonify({
            'success': True,
            'data': metrics,
            'alerts': alerts
        }), 200
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/metrics/history', methods=['GET'])
def get_history():
    """Get historical metrics"""
    try:
        hours = request.args.get('hours', 24, type=int)
        history = get_historical_metrics(hours)
        return jsonify({
            'success': True,
            'data': history,
            'hours': hours
        }), 200
    except Exception as e:
        logger.error(f"Error getting history: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/alerts', methods=['GET'])
def get_alerts():
    """Get recent alerts"""
    try:
        limit = request.args.get('limit', 50, type=int)
        alerts = get_alert_manager().get_recent_alerts(limit)
        return jsonify({
            'success': True,
            'data': alerts
        }), 200
    except Exception as e:
        logger.error(f"Error getting alerts: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/thresholds', methods=['GET'])
def get_thresholds():
    """Get current alert thresholds"""
    try:
        thresholds = get_alert_manager().get_thresholds()
        return jsonify({
            'success': True,
            'data': thresholds
        }), 200
    except Exception as e:
        logger.error(f"Error getting thresholds: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/thresholds', methods=['POST'])
def update_threshold():
    """Update alert threshold"""
    try:
        data = request.get_json()
        metric_type = data.get('metric_type')
        value = data.get('value')
        
        if not metric_type or not value:
            return jsonify({'success': False, 'error': 'Missing metric_type or value'}), 400
        
        success = get_alert_manager().update_threshold(metric_type, value)
        
        if success:
            return jsonify({'success': True, 'message': f'Updated {metric_type} threshold'}), 200
        else:
            return jsonify({'success': False, 'error': 'Invalid metric type'}), 400
            
    except Exception as e:
        logger.error(f"Error updating threshold: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@api_bp.route('/export', methods=['GET'])
def export_metrics():
    """Export metrics as JSON or CSV"""
    try:
        format_type = request.args.get('format', 'json')
        hours = request.args.get('hours', 24, type=int)
        
        history = get_historical_metrics(hours)
        
        if format_type == 'csv':
            import csv
            from flask import Response
            import io
            
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=['timestamp', 'cpu', 'memory', 'disk'])
            writer.writeheader()
            writer.writerows(history)
            
            return Response(
                output.getvalue(),
                mimetype='text/csv',
                headers={'Content-Disposition': 'attachment;filename=metrics.csv'}
            )
        else:
            return jsonify({
                'success': True,
                'data': history,
                'format': 'json'
            }), 200
            
    except Exception as e:
        logger.error(f"Error exporting metrics: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500