import sqlite3
import json
from datetime import datetime
import os

class Database:
    def __init__(self, db_path='intrusion_detection.db'):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize database tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create training results table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS training_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                model_name TEXT NOT NULL,
                metrics TEXT NOT NULL,
                classification_report TEXT NOT NULL,
                confusion_matrix TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create prediction results table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS prediction_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                model_type TEXT NOT NULL,
                predictions TEXT NOT NULL,
                detailed_data TEXT NOT NULL,
                threat_count INTEGER DEFAULT 0,
                total_records INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create system logs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                log_level TEXT NOT NULL,
                message TEXT NOT NULL,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create model registry table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS model_registry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_name TEXT NOT NULL,
                model_path TEXT NOT NULL,
                performance_metrics TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def save_training_results(self, filename, results):
        """Save training results to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for model_name, result in results.items():
            if 'error' not in result:
                cursor.execute('''
                    INSERT INTO training_results 
                    (filename, model_name, metrics, classification_report, confusion_matrix)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    filename,
                    model_name,
                    json.dumps(result['metrics']),
                    json.dumps(result['classification_report']),
                    json.dumps(result['confusion_matrix'])
                ))
        
        conn.commit()
        conn.close()
    
    def save_prediction_results(self, filename, predictions, detailed_data):
        """Save prediction results to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        threat_count = sum(predictions)
        total_records = len(predictions)
        
        cursor.execute('''
            INSERT INTO prediction_results 
            (filename, model_type, predictions, detailed_data, threat_count, total_records)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            filename,
            'ensemble',  # Default to ensemble
            json.dumps(predictions),
            json.dumps(detailed_data),
            threat_count,
            total_records
        ))
        
        conn.commit()
        conn.close()
    
    def get_detection_history(self, limit=50):
        """Get recent detection history"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT filename, model_type, threat_count, total_records, created_at
            FROM prediction_results
            ORDER BY created_at DESC
            LIMIT ?
        ''', (limit,))
        
        results = cursor.fetchall()
        conn.close()
        
        return [
            {
                'filename': row[0],
                'model_type': row[1],
                'threat_count': row[2],
                'total_records': row[3],
                'threat_percentage': (row[2] / row[3] * 100) if row[3] > 0 else 0,
                'created_at': row[4]
            }
            for row in results
        ]
    
    def get_system_stats(self):
        """Get system statistics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get total predictions
        cursor.execute('SELECT COUNT(*) FROM prediction_results')
        total_predictions = cursor.fetchone()[0]
        
        # Get total threats detected
        cursor.execute('SELECT SUM(threat_count), SUM(total_records) FROM prediction_results')
        threat_data = cursor.fetchone()
        total_threats = threat_data[0] or 0
        total_records = threat_data[1] or 0
        
        # Get model count
        cursor.execute('SELECT COUNT(DISTINCT model_name) FROM training_results')
        model_count = cursor.fetchone()[0]
        
        # Get recent activity
        cursor.execute('''
            SELECT COUNT(*) FROM prediction_results 
            WHERE created_at > datetime('now', '-24 hours')
        ''')
        recent_activity = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'total_predictions': total_predictions,
            'total_threats_detected': total_threats,
            'total_records_analyzed': total_records,
            'overall_threat_rate': (total_threats / total_records * 100) if total_records > 0 else 0,
            'models_trained': model_count,
            'recent_activity_24h': recent_activity
        }
    
    def log_event(self, level, message, details=None):
        """Log system events"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO system_logs (log_level, message, details)
            VALUES (?, ?, ?)
        ''', (level, message, json.dumps(details) if details else None))
        
        conn.commit()
        conn.close()
    
    def get_model_performance(self, model_name=None):
        """Get performance metrics for models"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if model_name:
            cursor.execute('''
                SELECT model_name, metrics, created_at
                FROM training_results
                WHERE model_name = ?
                ORDER BY created_at DESC
                LIMIT 10
            ''', (model_name,))
        else:
            cursor.execute('''
                SELECT model_name, metrics, created_at
                FROM training_results
                ORDER BY created_at DESC
                LIMIT 50
            ''')
        
        results = cursor.fetchall()
        conn.close()
        
        return [
            {
                'model_name': row[0],
                'metrics': json.loads(row[1]),
                'created_at': row[2]
            }
            for row in results
        ]
    
    def get_threat_trends(self, days=7):
        """Get threat detection trends over time"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT DATE(created_at) as date,
                   SUM(threat_count) as threats,
                   SUM(total_records) as total
            FROM prediction_results
            WHERE created_at > datetime('now', '-{} days')
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        '''.format(days))
        
        results = cursor.fetchall()
        conn.close()
        
        return [
            {
                'date': row[0],
                'threats': row[1],
                'total_records': row[2],
                'threat_rate': (row[1] / row[2] * 100) if row[2] > 0 else 0
            }
            for row in results
        ]
    
    def register_model(self, model_name, model_path, performance_metrics):
        """Register a new model in the system"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO model_registry 
            (model_name, model_path, performance_metrics, updated_at)
            VALUES (?, ?, ?, ?)
        ''', (
            model_name,
            model_path,
            json.dumps(performance_metrics),
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
    
    def get_active_models(self):
        """Get list of active models"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT model_name, performance_metrics, created_at
            FROM model_registry
            WHERE is_active = 1
            ORDER BY created_at DESC
        ''')
        
        results = cursor.fetchall()
        conn.close()
        
        return [
            {
                'model_name': row[0],
                'performance_metrics': json.loads(row[1]),
                'created_at': row[2]
            }
            for row in results
        ]
