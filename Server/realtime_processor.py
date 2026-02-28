from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
import threading
import time
import random
import pandas as pd
import numpy as np
from datetime import datetime
import json

class RealTimeProcessor:
    def __init__(self, ml_models, preprocessor, socketio):
        self.ml_models = ml_models
        self.preprocessor = preprocessor
        self.socketio = socketio
        self.is_streaming = False
        self.stream_thread = None
        self.alert_threshold = 0.7
        self.alert_history = []
        
    def start_streaming(self, stream_config):
        """Start real-time network data streaming"""
        if self.is_streaming:
            print("Streaming already active")
            return {"message": "Streaming already active"}
        
        print(f"Starting streaming with config: {stream_config}")
        self.is_streaming = True
        self.stream_config = stream_config
        
        # Start background thread
        self.stream_thread = threading.Thread(target=self._stream_data)
        self.stream_thread.daemon = True
        self.stream_thread.start()
        
        print("Streaming thread started")
        return {"message": "Streaming started"}
    
    def stop_streaming(self):
        """Stop real-time streaming"""
        self.is_streaming = False
        if self.stream_thread:
            self.stream_thread.join(timeout=5)
        return {"message": "Streaming stopped"}
    
    def _stream_data(self):
        """Generate and stream simulated network data"""
        packet_count = 0
        while self.is_streaming:
            try:
                packet_count += 1
                print(f"Generating packet #{packet_count}")
                
                # Generate realistic network data
                network_data = self._generate_network_packet()
                print(f"Generated network data: {network_data}")
                
                # Create result with simulated predictions if models aren't trained
                try:
                    # Try to process through ML models
                    processed_data = self.preprocessor.transform_data(pd.DataFrame([network_data]))
                    prediction = self.ml_models.predict(processed_data, 'ensemble')[0]
                    probability = self.ml_models.predict_proba(processed_data, 'ensemble')[0][1]
                except Exception as model_error:
                    print(f"Model prediction failed, using simulated data: {model_error}")
                    # Generate simulated predictions based on network data patterns
                    prediction = self._simulate_prediction(network_data)
                    probability = self._simulate_probability(network_data)
                
                # Create result
                result = {
                    'timestamp': datetime.now().isoformat(),
                    'data': network_data,
                    'prediction': int(prediction),
                    'probability': float(probability),
                    'threat_level': 'HIGH' if probability > 0.7 else 'MEDIUM' if probability > 0.3 else 'LOW'
                }
                
                print(f"Emitting result: {result}")
                # Emit to all connected clients
                self.socketio.emit('network_data', result)
                
                # Check for alerts
                if probability >= self.alert_threshold:
                    print(f"Alert triggered! Probability: {probability}")
                    self._send_alert(result)
                
                # Stream rate (adjust as needed)
                time.sleep(self.stream_config.get('interval', 1))
                
            except Exception as e:
                print(f"Streaming error: {e}")
                time.sleep(1)
    
    def _generate_network_packet(self):
        """Generate realistic network packet data"""
        protocols = ['TCP', 'UDP', 'ICMP']
        services = ['http', 'ftp', 'ssh', 'smtp', 'dns', 'telnet']
        
        # Generate normal and attack patterns
        is_attack = random.random() < 0.15  # 15% chance of attack
        
        if is_attack:
            # Attack patterns
            attack_types = ['dos', 'probe', 'r2l', 'u2r']
            attack_type = random.choice(attack_types)
            
            if attack_type == 'dos':
                return {
                    'duration': random.uniform(0, 0.1),
                    'protocol': random.choice(['TCP', 'UDP']),
                    'service': random.choice(['http', 'echo']),
                    'src_bytes': random.randint(1000, 10000),
                    'dst_bytes': random.randint(0, 100),
                    'count': random.randint(100, 500),
                    'srv_count': random.randint(50, 200),
                    'serror_rate': random.uniform(0.5, 1.0),
                    'srv_serror_rate': random.uniform(0.5, 1.0),
                    'rerror_rate': random.uniform(0, 0.3),
                    'srv_rerror_rate': random.uniform(0, 0.3),
                    'same_srv_rate': random.uniform(0.8, 1.0),
                    'diff_srv_rate': random.uniform(0, 0.2),
                    'dst_host_count': random.randint(200, 500),
                    'dst_host_srv_count': random.randint(100, 300),
                    'dst_host_same_srv_rate': random.uniform(0.7, 1.0),
                    'dst_host_diff_srv_rate': random.uniform(0, 0.3),
                    'dst_host_serror_rate': random.uniform(0.6, 1.0),
                    'dst_host_srv_serror_rate': random.uniform(0.6, 1.0)
                }
            elif attack_type == 'probe':
                return {
                    'duration': random.uniform(0, 5),
                    'protocol': random.choice(['TCP', 'UDP', 'ICMP']),
                    'service': random.choice(services),
                    'src_bytes': random.randint(0, 1000),
                    'dst_bytes': random.randint(0, 500),
                    'count': random.randint(10, 100),
                    'srv_count': random.randint(5, 50),
                    'serror_rate': random.uniform(0, 0.5),
                    'srv_serror_rate': random.uniform(0, 0.5),
                    'rerror_rate': random.uniform(0.3, 0.8),
                    'srv_rerror_rate': random.uniform(0.3, 0.8),
                    'same_srv_rate': random.uniform(0.1, 0.5),
                    'diff_srv_rate': random.uniform(0.5, 0.9),
                    'dst_host_count': random.randint(50, 200),
                    'dst_host_srv_count': random.randint(20, 100),
                    'dst_host_same_srv_rate': random.uniform(0.1, 0.4),
                    'dst_host_diff_srv_rate': random.uniform(0.6, 0.9),
                    'dst_host_serror_rate': random.uniform(0.2, 0.6),
                    'dst_host_srv_serror_rate': random.uniform(0.2, 0.6)
                }
        else:
            # Normal traffic
            return {
                'duration': random.uniform(0.1, 10),
                'protocol': random.choice(protocols),
                'service': random.choice(services),
                'src_bytes': random.randint(100, 5000),
                'dst_bytes': random.randint(50, 3000),
                'count': random.randint(1, 20),
                'srv_count': random.randint(1, 10),
                'serror_rate': random.uniform(0, 0.1),
                'srv_serror_rate': random.uniform(0, 0.1),
                'rerror_rate': random.uniform(0, 0.1),
                'srv_rerror_rate': random.uniform(0, 0.1),
                'same_srv_rate': random.uniform(0.5, 1.0),
                'diff_srv_rate': random.uniform(0, 0.5),
                'dst_host_count': random.randint(1, 50),
                'dst_host_srv_count': random.randint(1, 25),
                'dst_host_same_srv_rate': random.uniform(0.5, 1.0),
                'dst_host_diff_srv_rate': random.uniform(0, 0.5),
                'dst_host_serror_rate': random.uniform(0, 0.1),
                'dst_host_srv_serror_rate': random.uniform(0, 0.1)
            }
    
    def _send_alert(self, result):
        """Send alert for high-threat detection"""
        alert = {
            'id': len(self.alert_history) + 1,
            'timestamp': result['timestamp'],
            'threat_level': result['threat_level'],
            'probability': result['probability'],
            'data': result['data'],
            'message': f"High threat detected! Probability: {result['probability']:.2%}"
        }
        
        self.alert_history.append(alert)
        
        # Emit alert to all clients
        self.socketio.emit('security_alert', alert)
        
        # Keep only last 100 alerts
        if len(self.alert_history) > 100:
            self.alert_history = self.alert_history[-100:]
    
    def get_alert_history(self):
        """Get recent alert history"""
        return self.alert_history[-50:]  # Return last 50 alerts
    
    def set_alert_threshold(self, threshold):
        """Set alert threshold (0.0 - 1.0)"""
        if 0 <= threshold <= 1:
            self.alert_threshold = threshold
            return {"message": f"Alert threshold set to {threshold}"}
        else:
            return {"error": "Threshold must be between 0 and 1"}
    
    def get_streaming_status(self):
        """Get current streaming status"""
        return {
            'is_streaming': self.is_streaming,
            'alert_threshold': self.alert_threshold,
            'total_alerts': len(self.alert_history),
            'recent_alerts': len([a for a in self.alert_history 
                                 if (datetime.now() - datetime.fromisoformat(a['timestamp'])).seconds < 3600])
        }
    
    def _simulate_prediction(self, network_data):
        """Simulate prediction based on network data patterns"""
        # Look for suspicious patterns in the data
        suspicious_indicators = 0
        
        # Check for high byte counts (potential DoS)
        if network_data.get('src_bytes', 0) > 5000:
            suspicious_indicators += 1
        
        # Check for low duration (potential scan)
        if network_data.get('duration', 0) < 0.1:
            suspicious_indicators += 1
        
        # Check for high error rates
        if network_data.get('serror_rate', 0) > 0.5:
            suspicious_indicators += 1
        
        # Check for high connection counts
        if network_data.get('count', 0) > 100:
            suspicious_indicators += 1
        
        # Return 1 (threat) if multiple suspicious indicators
        return 1 if suspicious_indicators >= 2 else 0
    
    def _simulate_probability(self, network_data):
        """Simulate threat probability based on network data"""
        base_prob = 0.1  # Base 10% probability
        
        # Increase probability based on suspicious patterns
        if network_data.get('src_bytes', 0) > 5000:
            base_prob += 0.3
        
        if network_data.get('duration', 0) < 0.1:
            base_prob += 0.2
        
        if network_data.get('serror_rate', 0) > 0.5:
            base_prob += 0.3
        
        if network_data.get('count', 0) > 100:
            base_prob += 0.2
        
        # Add some randomness
        base_prob += random.uniform(-0.1, 0.1)
        
        # Ensure probability is between 0 and 1
        return max(0.0, min(1.0, base_prob))
