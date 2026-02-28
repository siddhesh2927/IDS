from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
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

app = Flask(__name__)
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MODEL_FOLDER'] = 'models'

# Ensure directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['MODEL_FOLDER'], exist_ok=True)

# Initialize components
db = Database()
preprocessor = DataPreprocessor()
ml_models = MLModels()

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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
