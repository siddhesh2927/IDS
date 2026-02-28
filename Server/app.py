from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import pandas as pd
import numpy as np
import joblib
import os
from datetime import datetime
import json
from werkzeug.utils import secure_filename
import sqlite3
from data_preprocessor import DataPreprocessor
from ml_models import MLModels
from database import Database
from dataset_manager import DatasetManager
from realtime_processor import RealTimeProcessor

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024  # 200MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MODEL_FOLDER'] = 'models'

# Ensure directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['MODEL_FOLDER'], exist_ok=True)

# Initialize components
db = Database()
preprocessor = DataPreprocessor()
ml_models = MLModels()
dataset_manager = DatasetManager(app.config['UPLOAD_FOLDER'])
realtime_processor = RealTimeProcessor(ml_models, preprocessor, socketio)

@app.route('/')
def index():
    return jsonify({"message": "Intrusion Detection System API", "version": "1.0"})

@app.route('/upload', methods=['POST'])
def upload_dataset():
    """Upload and process network dataset"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if file and file.filename.endswith('.csv'):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Process the dataset
            data_info = preprocessor.analyze_dataset(filepath)
            
            return jsonify({
                "message": "File uploaded successfully",
                "filename": filename,
                "data_info": data_info
            })
        else:
            return jsonify({"error": "Only CSV files are supported"}), 400
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/train', methods=['POST'])
def train_models():
    """Train ML models on uploaded dataset"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        
        if not filename:
            return jsonify({"error": "No filename provided"}), 400
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(filepath):
            return jsonify({"error": "File not found"}), 404
        
        # Preprocess data
        X_train, X_test, y_train, y_test = preprocessor.preprocess_data(filepath)
        
        # Train models
        results = ml_models.train_all_models(X_train, X_test, y_train, y_test)
        
        # Save models
        ml_models.save_models(app.config['MODEL_FOLDER'])
        
        # Store training results in database
        db.save_training_results(filename, results)
        
        return jsonify({
            "message": "Models trained successfully",
            "results": results
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/predict', methods=['POST'])
def predict_threats():
    """Predict threats on new data"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        model_type = data.get('model_type', 'ensemble')
        
        if not filename:
            return jsonify({"error": "No filename provided"}), 400
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(filepath):
            return jsonify({"error": "File not found"}), 404
        
        # Load and preprocess data
        df = pd.read_csv(filepath)
        X_processed = preprocessor.transform_data(df)
        
        # Make predictions
        predictions = ml_models.predict(X_processed, model_type)
        
        # Add predictions to original data
        df['threat_prediction'] = predictions
        df['threat_probability'] = ml_models.predict_proba(X_processed, model_type)
        df['timestamp'] = datetime.now().isoformat()
        
        # Store results
        db.save_prediction_results(filename, predictions.tolist(), df.to_dict('records'))
        
        # Generate summary statistics
        threat_summary = {
            "total_records": len(predictions),
            "threats_detected": int(np.sum(predictions)),
            "benign_records": int(len(predictions) - np.sum(predictions)),
            "threat_percentage": float(np.sum(predictions) / len(predictions) * 100)
        }
        
        return jsonify({
            "predictions": predictions.tolist(),
            "probabilities": ml_models.predict_proba(X_processed, model_type).tolist(),
            "summary": threat_summary,
            "detailed_data": df.head(100).to_dict('records')  # Return first 100 records
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/models', methods=['GET'])
def get_available_models():
    """Get list of available trained models"""
    try:
        models = ml_models.get_available_models(app.config['MODEL_FOLDER'])
        return jsonify({"models": models})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/history', methods=['GET'])
def get_detection_history():
    """Get history of threat detections"""
    try:
        history = db.get_detection_history()
        return jsonify({"history": history})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/stats', methods=['GET'])
def get_system_stats():
    """Get system statistics"""
    try:
        stats = db.get_system_stats()
        return jsonify({"stats": stats})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Kaggle Dataset Management Endpoints
@app.route('/kaggle/authenticate', methods=['POST'])
def authenticate_kaggle():
    """Authenticate with Kaggle API"""
    try:
        data = request.get_json()
        username = data.get('username')
        key = data.get('key')
        
        if not username or not key:
            return jsonify({"error": "Username and key required"}), 400
        
        success = dataset_manager.authenticate_kaggle(username, key)
        if success:
            return jsonify({"message": "Authentication successful"})
        else:
            return jsonify({"error": "Authentication failed. Please check your Kaggle credentials."}), 401
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/kaggle/datasets/popular', methods=['GET'])
def get_popular_datasets():
    """Get popular intrusion detection datasets"""
    try:
        datasets = dataset_manager.get_popular_intrusion_datasets()
        return jsonify({"datasets": datasets})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/kaggle/datasets/search', methods=['POST'])
def search_datasets():
    """Search for datasets on Kaggle"""
    try:
        data = request.get_json()
        query = data.get('query', '')
        max_results = data.get('max_results', 10)
        
        datasets = dataset_manager.search_datasets(query, max_results)
        return jsonify({"datasets": datasets})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/kaggle/datasets/download', methods=['POST'])
def download_dataset():
    """Download dataset from Kaggle"""
    try:
        data = request.get_json()
        dataset_ref = data.get('dataset_ref')
        
        if not dataset_ref:
            return jsonify({"error": "Dataset reference required"}), 400
        
        result = dataset_manager.download_dataset(dataset_ref)
        
        # Analyze each CSV file
        analyses = []
        for csv_file in result['csv_files']:
            analysis = dataset_manager.analyze_downloaded_dataset(csv_file)
            analyses.append(analysis)
        
        return jsonify({
            "message": "Dataset downloaded successfully",
            "dataset_info": result,
            "analyses": analyses
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/datasets/prepare', methods=['POST'])
def prepare_dataset():
    """Prepare dataset for training"""
    try:
        data = request.get_json()
        csv_file = data.get('csv_file')
        target_column = data.get('target_column')
        
        if not csv_file:
            return jsonify({"error": "CSV file path required"}), 400
        
        result = dataset_manager.prepare_dataset_for_training(csv_file, target_column)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Real-time Streaming Endpoints
@app.route('/streaming/start', methods=['POST'])
def start_streaming():
    """Start real-time network data streaming"""
    try:
        data = request.get_json()
        config = data.get('config', {})
        config.setdefault('interval', 1)  # Default 1 second interval
        
        result = realtime_processor.start_streaming(config)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/streaming/stop', methods=['POST'])
def stop_streaming():
    """Stop real-time streaming"""
    try:
        result = realtime_processor.stop_streaming()
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/streaming/status', methods=['GET'])
def get_streaming_status():
    """Get streaming status"""
    try:
        status = realtime_processor.get_streaming_status()
        return jsonify(status)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/alerts', methods=['GET'])
def get_alerts():
    """Get alert history"""
    try:
        alerts = realtime_processor.get_alert_history()
        return jsonify({"alerts": alerts})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/alerts/threshold', methods=['POST'])
def set_alert_threshold():
    """Set alert threshold"""
    try:
        data = request.get_json()
        threshold = data.get('threshold', 0.7)
        
        result = realtime_processor.set_alert_threshold(threshold)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# WebSocket Events
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    emit('connected', {'message': 'Connected to Intrusion Detection System'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print('Client disconnected')

@socketio.on('get_status')
def handle_get_status():
    """Handle status request"""
    status = realtime_processor.get_streaming_status()
    emit('status_update', status)

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
