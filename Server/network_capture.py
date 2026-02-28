import threading
import time
import socket
import psutil
from scapy.all import sniff, IP, TCP, UDP, ICMP, ARP, get_if_list
from scapy.arch.windows import get_windows_if_list
import pandas as pd
import numpy as np
from datetime import datetime
import json
import os
from pathlib import Path

class NetworkCapture:
    def __init__(self, socketio, ml_models, preprocessor):
        self.socketio = socketio
        self.ml_models = ml_models
        self.preprocessor = preprocessor
        self.is_capturing = False
        self.capture_thread = None
        self.interface = None
        self.capture_mode = 'simulated'  # 'simulated', 'real', 'hybrid', 'logs'
        self.privacy_mode = True  # Anonymize IPs by default
        self.filter_rules = {
            'protocols': ['TCP', 'UDP', 'ICMP'],
            'ports': [],  # Empty means all ports
            'ip_filters': [],  # Empty means all IPs
            'min_packet_size': 0
        }
        self.captured_packets = []
        self.alert_threshold = 0.7
        self.log_file_path = None
        
    def get_network_interfaces(self):
        """Get available network interfaces"""
        try:
            interfaces = []
            
            # Get Windows network interfaces
            if os.name == 'nt':  # Windows
                windows_interfaces = get_windows_if_list()
                for iface in windows_interfaces:
                    interfaces.append({
                        'name': iface['name'],
                        'description': iface.get('description', ''),
                        'ip': iface.get('ips', [''])[0] if iface.get('ips') else '',
                        'mac': iface.get('mac', ''),
                        'is_up': iface.get('is_up', False),
                        'guid': iface.get('guid', '')
                    })
            else:
                # Unix-like systems
                scapy_interfaces = get_if_list()
                for iface_name in scapy_interfaces:
                    try:
                        addrs = psutil.net_if_addrs().get(iface_name, [])
                        ip = next((addr.address for addr in addrs if addr.family == socket.AF_INET), '')
                        mac = next((addr.address for addr in addrs if addr.family == psutil.AF_LINK), '')
                        
                        interfaces.append({
                            'name': iface_name,
                            'description': iface_name,
                            'ip': ip,
                            'mac': mac,
                            'is_up': True
                        })
                    except:
                        continue
            
            return interfaces
        except Exception as e:
            print(f"Error getting network interfaces: {e}")
            return []
    
    def start_capture(self, config):
        """Start network packet capture"""
        if self.is_capturing:
            return {"message": "Capture already active"}
        
        self.capture_mode = config.get('mode', 'simulated')
        self.interface = config.get('interface')
        self.privacy_mode = config.get('privacy_mode', True)
        self.filter_rules = config.get('filters', self.filter_rules)
        self.alert_threshold = config.get('alert_threshold', 0.7)
        
        print(f"Starting {self.capture_mode} capture on interface: {self.interface}")
        
        self.is_capturing = True
        self.capture_thread = threading.Thread(target=self._capture_loop)
        self.capture_thread.daemon = True
        self.capture_thread.start()
        
        return {"message": f"{self.capture_mode.capitalize()} capture started"}
    
    def stop_capture(self):
        """Stop network packet capture"""
        self.is_capturing = False
        if self.capture_thread:
            self.capture_thread.join(timeout=5)
        return {"message": "Capture stopped"}
    
    def _capture_loop(self):
        """Main capture loop"""
        try:
            if self.capture_mode == 'real':
                self._capture_real_packets()
            elif self.capture_mode == 'simulated':
                self._capture_simulated_packets()
            elif self.capture_mode == 'hybrid':
                self._capture_hybrid_packets()
            elif self.capture_mode == 'logs':
                self._capture_from_logs()
        except Exception as e:
            print(f"Capture loop error: {e}")
            self.is_capturing = False
    
    def _capture_real_packets(self):
        """Capture real network packets using Scapy"""
        def packet_handler(packet):
            if not self.is_capturing:
                return
            
            try:
                # Extract packet information
                packet_info = self._extract_packet_info(packet)
                
                if packet_info and self._should_process_packet(packet_info):
                    # Process through ML models
                    processed_data = self._preprocess_packet(packet_info)
                    prediction, probability = self._analyze_packet(processed_data)
                    
                    # Create result
                    result = {
                        'timestamp': datetime.now().isoformat(),
                        'source': 'real_capture',
                        'data': packet_info,
                        'prediction': int(prediction),
                        'probability': float(probability),
                        'threat_level': self._get_threat_level(probability)
                    }
                    
                    # Emit to clients
                    self.socketio.emit('network_data', result)
                    
                    # Check for alerts
                    if probability >= self.alert_threshold:
                        self._send_alert(result)
                    
                    self.captured_packets.append(result)
                    if len(self.captured_packets) > 1000:
                        self.captured_packets = self.captured_packets[-1000:]
                        
            except Exception as e:
                print(f"Packet processing error: {e}")
        
        # Start sniffing
        filter_expr = self._build_filter_expression()
        print(f"Starting packet capture with filter: {filter_expr}")
        
        sniff(iface=self.interface, prn=packet_handler, filter=filter_expr, 
              stop_filter=lambda x: not self.is_capturing, store=0)
    
    def _capture_simulated_packets(self):
        """Generate simulated network packets"""
        while self.is_capturing:
            try:
                # Generate realistic packet data
                packet_info = self._generate_simulated_packet()
                
                # Process through ML models
                processed_data = self._preprocess_packet(packet_info)
                prediction, probability = self._analyze_packet(processed_data)
                
                # Create result
                result = {
                    'timestamp': datetime.now().isoformat(),
                    'source': 'simulated',
                    'data': packet_info,
                    'prediction': int(prediction),
                    'probability': float(probability),
                    'threat_level': self._get_threat_level(probability)
                }
                
                # Emit to clients
                self.socketio.emit('network_data', result)
                
                # Check for alerts
                if probability >= self.alert_threshold:
                    self._send_alert(result)
                
                self.captured_packets.append(result)
                if len(self.captured_packets) > 1000:
                    self.captured_packets = self.captured_packets[-1000:]
                
                time.sleep(1)  # Generate 1 packet per second
                
            except Exception as e:
                print(f"Simulated packet error: {e}")
                time.sleep(1)
    
    def _capture_hybrid_packets(self):
        """Capture both real and simulated packets"""
        real_thread = threading.Thread(target=self._capture_real_packets)
        simulated_thread = threading.Thread(target=self._capture_simulated_packets)
        
        real_thread.daemon = True
        simulated_thread.daemon = True
        
        real_thread.start()
        simulated_thread.start()
        
        real_thread.join()
        simulated_thread.join()
    
    def _capture_from_logs(self):
        """Read packets from log files (Wireshark, firewall logs)"""
        if not self.log_file_path or not os.path.exists(self.log_file_path):
            print("No log file specified or file not found")
            return
        
        try:
            # Read log file and process entries
            with open(self.log_file_path, 'r') as f:
                for line in f:
                    if not self.is_capturing:
                        break
                    
                    # Parse log entry (simplified - would need specific parsers for different log formats)
                    packet_info = self._parse_log_entry(line.strip())
                    
                    if packet_info:
                        processed_data = self._preprocess_packet(packet_info)
                        prediction, probability = self._analyze_packet(processed_data)
                        
                        result = {
                            'timestamp': datetime.now().isoformat(),
                            'source': 'log_file',
                            'data': packet_info,
                            'prediction': int(prediction),
                            'probability': float(probability),
                            'threat_level': self._get_threat_level(probability)
                        }
                        
                        self.socketio.emit('network_data', result)
                        
                        if probability >= self.alert_threshold:
                            self._send_alert(result)
                    
                    time.sleep(0.1)  # Small delay between log entries
                    
        except Exception as e:
            print(f"Log file reading error: {e}")
    
    def _extract_packet_info(self, packet):
        """Extract relevant information from Scapy packet"""
        try:
            info = {}
            
            if IP in packet:
                info['src_ip'] = self._anonymize_ip(packet[IP].src) if self.privacy_mode else packet[IP].src
                info['dst_ip'] = self._anonymize_ip(packet[IP].dst) if self.privacy_mode else packet[IP].dst
                info['protocol'] = packet[IP].proto
                info['ip_version'] = packet[IP].version
                info['ttl'] = packet[IP].ttl
                info['ip_len'] = packet[IP].len
            
            if TCP in packet:
                info['transport_protocol'] = 'TCP'
                info['src_port'] = packet[TCP].sport
                info['dst_port'] = packet[TCP].dport
                info['tcp_flags'] = packet[TCP].flags
                info['tcp_seq'] = packet[TCP].seq
                info['tcp_ack'] = packet[TCP].ack
                info['tcp_window'] = packet[TCP].window
                
            elif UDP in packet:
                info['transport_protocol'] = 'UDP'
                info['src_port'] = packet[UDP].sport
                info['dst_port'] = packet[UDP].dport
                
            elif ICMP in packet:
                info['transport_protocol'] = 'ICMP'
                info['icmp_type'] = packet[ICMP].type
                info['icmp_code'] = packet[ICMP].code
            
            # Packet size and timing
            info['packet_size'] = len(packet)
            info['timestamp'] = float(packet.time) if hasattr(packet, 'time') else time.time()
            
            return info
            
        except Exception as e:
            print(f"Packet extraction error: {e}")
            return None
    
    def _generate_simulated_packet(self):
        """Generate realistic simulated packet data"""
        protocols = ['TCP', 'UDP', 'ICMP']
        common_ports = [80, 443, 22, 21, 25, 53, 110, 143, 993, 995]
        
        # Generate packet with potential attack patterns
        is_suspicious = np.random.random() < 0.15  # 15% chance of suspicious packet
        
        packet_info = {
            'src_ip': self._anonymize_ip(f"192.168.1.{np.random.randint(1, 254)}"),
            'dst_ip': self._anonymize_ip(f"10.0.0.{np.random.randint(1, 254)}"),
            'protocol': np.random.choice([6, 17, 1]),  # TCP, UDP, ICMP
            'transport_protocol': np.random.choice(protocols),
            'src_port': np.random.choice(common_ports) if not is_suspicious else np.random.randint(1, 65535),
            'dst_port': np.random.choice(common_ports),
            'packet_size': np.random.randint(40, 1500) if not is_suspicious else np.random.randint(1000, 8000),
            'timestamp': time.time(),
            'ip_version': 4,
            'ttl': np.random.randint(32, 128)
        }
        
        if is_suspicious:
            # Add suspicious characteristics
            packet_info.update({
                'tcp_flags': np.random.choice([2, 18, 24]),  # SYN, FIN, RST flags
                'packet_size': np.random.randint(1000, 8000),  # Large packets
                'src_port': np.random.randint(1, 1024),  # Privileged ports
                'dst_port': np.random.randint(1, 1024),
            })
        
        return packet_info
    
    def _preprocess_packet(self, packet_info):
        """Preprocess packet data for ML model input"""
        try:
            # Convert packet info to ML model format
            features = {
                'duration': 0.001,  # Default duration for single packet
                'protocol': packet_info.get('transport_protocol', 'TCP'),
                'service': self._map_port_to_service(packet_info.get('dst_port', 80)),
                'src_bytes': packet_info.get('packet_size', 0),
                'dst_bytes': 0,  # Would need bidirectional capture
                'count': 1,
                'srv_count': 1,
                'serror_rate': 0.0,
                'srv_serror_rate': 0.0,
                'rerror_rate': 0.0,
                'srv_rerror_rate': 0.0,
                'same_srv_rate': 1.0,
                'diff_srv_rate': 0.0,
                'dst_host_count': 1,
                'dst_host_srv_count': 1,
                'dst_host_same_srv_rate': 1.0,
                'dst_host_diff_srv_rate': 0.0,
                'dst_host_serror_rate': 0.0,
                'dst_host_srv_serror_rate': 0.0
            }
            
            # Create DataFrame for preprocessing
            df = pd.DataFrame([features])
            
            # Use the existing preprocessor
            try:
                processed = self.preprocessor.transform_data(df)
                return processed
            except:
                # Fallback: create simple numeric array
                numeric_features = [
                    packet_info.get('packet_size', 0),
                    packet_info.get('src_port', 0),
                    packet_info.get('dst_port', 0),
                    1 if packet_info.get('transport_protocol') == 'TCP' else 0,
                    1 if packet_info.get('transport_protocol') == 'UDP' else 0,
                    1 if packet_info.get('transport_protocol') == 'ICMP' else 0
                ]
                return pd.DataFrame([numeric_features])
                
        except Exception as e:
            print(f"Packet preprocessing error: {e}")
            # Return basic features as fallback
            return pd.DataFrame([[packet_info.get('packet_size', 0), 80, 443, 1, 0, 0]])
    
    def _analyze_packet(self, processed_data):
        """Analyze packet using ML models or fallback methods"""
        try:
            # Try to use trained ML models
            if hasattr(self.ml_models, 'models') and self.ml_models.models:
                prediction = self.ml_models.predict(processed_data, 'ensemble')[0]
                probability = self.ml_models.predict_proba(processed_data, 'ensemble')[0][1]
            else:
                # Use rule-based detection
                prediction, probability = self._rule_based_detection(processed_data)
            
            return prediction, probability
            
        except Exception as e:
            print(f"Packet analysis error: {e}")
            # Fallback to simple rule-based detection
            return self._rule_based_detection(processed_data)
    
    def _rule_based_detection(self, processed_data):
        """Rule-based threat detection as fallback"""
        try:
            # Convert to numpy array if needed
            if hasattr(processed_data, 'values'):
                data_array = processed_data.values[0]
            else:
                data_array = np.array(processed_data).flatten()
            
            # Simple rule-based detection
            threat_score = 0.0
            
            # Check packet size (large packets might be suspicious)
            if len(data_array) > 0 and data_array[0] > 1000:  # packet_size
                threat_score += 0.3
            
            # Check for unusual ports
            if len(data_array) > 2:
                src_port = data_array[1] if len(data_array) > 1 else 0
                dst_port = data_array[2] if len(data_array) > 2 else 0
                
                # Unusual ports
                if src_port < 1024 or dst_port < 1024:
                    threat_score += 0.2
                if src_port > 50000 or dst_port > 50000:
                    threat_score += 0.1
            
            # Add some randomness
            threat_score += np.random.uniform(0, 0.2)
            
            # Determine prediction and probability
            probability = min(1.0, max(0.0, threat_score))
            prediction = 1 if probability > 0.5 else 0
            
            return prediction, probability
            
        except Exception as e:
            print(f"Rule-based detection error: {e}")
            return 0, 0.1  # Default to benign
    
    def _should_process_packet(self, packet_info):
        """Check if packet should be processed based on filters"""
        # Check protocol filter
        if self.filter_rules.get('protocols'):
            if packet_info.get('transport_protocol') not in self.filter_rules['protocols']:
                return False
        
        # Check port filter
        if self.filter_rules.get('ports'):
            src_port = packet_info.get('src_port')
            dst_port = packet_info.get('dst_port')
            if src_port not in self.filter_rules['ports'] and dst_port not in self.filter_rules['ports']:
                return False
        
        # Check packet size filter
        min_size = self.filter_rules.get('min_packet_size', 0)
        if packet_info.get('packet_size', 0) < min_size:
            return False
        
        return True
    
    def _build_filter_expression(self):
        """Build BPF filter expression for packet capture"""
        filters = []
        
        # Protocol filters
        protocols = self.filter_rules.get('protocols', [])
        if protocols:
            protocol_map = {'TCP': 'tcp', 'UDP': 'udp', 'ICMP': 'icmp'}
            protocol_filters = [protocol_map[p] for p in protocols if p in protocol_map]
            if protocol_filters:
                filters.append(f"({' or '.join(protocol_filters)})")
        
        # Port filters
        ports = self.filter_rules.get('ports', [])
        if ports:
            port_filters = [f"port {port}" for port in ports]
            filters.append(f"({' or '.join(port_filters)})")
        
        return ' and '.join(filters) if filters else ''
    
    def _anonymize_ip(self, ip):
        """Anonymize IP address for privacy"""
        if not self.privacy_mode:
            return ip
        
        try:
            parts = ip.split('.')
            if len(parts) == 4:
                # Keep first two octets, anonymize last two
                return f"{parts[0]}.{parts[1]}.xxx.xxx"
        except:
            pass
        
        return "xxx.xxx.xxx.xxx"
    
    def _map_port_to_service(self, port):
        """Map port number to service name"""
        port_service_map = {
            80: 'http', 443: 'https', 22: 'ssh', 21: 'ftp',
            25: 'smtp', 53: 'dns', 110: 'pop3', 143: 'imap',
            993: 'imaps', 995: 'pop3s', 23: 'telnet', 3306: 'mysql'
        }
        return port_service_map.get(port, 'other')
    
    def _get_threat_level(self, probability):
        """Get threat level based on probability"""
        if probability > 0.7:
            return 'HIGH'
        elif probability > 0.3:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def _send_alert(self, result):
        """Send security alert"""
        alert = {
            'id': len(self.captured_packets) + 1,
            'timestamp': result['timestamp'],
            'threat_level': result['threat_level'],
            'probability': result['probability'],
            'source': result['source'],
            'data': result['data'],
            'message': f"Threat detected in {result['source']} data! Probability: {result['probability']:.2%}"
        }
        
        self.socketio.emit('security_alert', alert)
    
    def _parse_log_entry(self, log_line):
        """Parse log entry (simplified - would need specific parsers)"""
        # This is a placeholder - would need specific parsers for different log formats
        try:
            # Example for simple log format
            parts = log_line.split()
            if len(parts) >= 6:
                return {
                    'src_ip': self._anonymize_ip(parts[0]),
                    'dst_ip': self._anonymize_ip(parts[1]),
                    'protocol': parts[2],
                    'src_port': int(parts[3]),
                    'dst_port': int(parts[4]),
                    'packet_size': int(parts[5]),
                    'timestamp': time.time()
                }
        except:
            pass
        return None
    
    def get_capture_status(self):
        """Get current capture status"""
        return {
            'is_capturing': self.is_capturing,
            'capture_mode': self.capture_mode,
            'interface': self.interface,
            'privacy_mode': self.privacy_mode,
            'total_packets': len(self.captured_packets),
            'alert_threshold': self.alert_threshold
        }
    
    def set_log_file(self, file_path):
        """Set log file path for log-based capture"""
        self.log_file_path = file_path
        return {"message": f"Log file set to {file_path}"}
