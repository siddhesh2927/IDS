import requests
import os
import zipfile
import pandas as pd
import json

class DatasetManager:
    def __init__(self, upload_folder='uploads'):
        self.upload_folder = upload_folder
        self.api = None
        self.authenticated = False
        
    def _get_api(self):
        """Get Kaggle API instance only when needed"""
        if self.api is None:
            from kaggle.api.kaggle_api_extended import KaggleApi
            self.api = KaggleApi()
        return self.api
        
    def authenticate_kaggle(self, username, key):
        """Authenticate with Kaggle API"""
        try:
            # Set environment variables for Kaggle API
            os.environ['KAGGLE_USERNAME'] = username
            os.environ['KAGGLE_KEY'] = key
            
            # Import and initialize Kaggle API
            api = self._get_api()
            
            # Test authentication by trying to get user info
            try:
                user_info = api.user_account()
                print(f"Successfully authenticated as: {user_info.get('username', username)}")
                self.authenticated = True
                return True
            except Exception as auth_error:
                print(f"Kaggle authentication test failed: {str(auth_error)}")
                # Try alternative authentication method
                try:
                    api.authenticate()
                    self.authenticated = True
                    return True
                except Exception as alt_error:
                    print(f"Alternative authentication failed: {str(alt_error)}")
                    self.authenticated = False
                    return False
                    
        except Exception as e:
            print(f"Kaggle authentication failed: {str(e)}")
            self.authenticated = False
            return False
    
    def search_datasets(self, query, max_results=10):
        """Search for datasets on Kaggle"""
        if not self.authenticated:
            raise Exception("Please authenticate with Kaggle first")
        
        try:
            api = self._get_api()
            datasets = api.dataset_list(search=query, page_size=max_results)
            result = []
            for dataset in datasets:
                result.append({
                    'ref': dataset.ref,
                    'title': dataset.title,
                    'size': dataset.totalBytes,
                    'files': dataset.files,
                    'description': dataset.subtitle[:200] + '...' if dataset.subtitle else 'No description'
                })
            return result
        except Exception as e:
            raise Exception(f"Dataset search failed: {str(e)}")
    
    def download_dataset(self, dataset_ref, file_name=None):
        """Download dataset from Kaggle or generate local dataset"""
        if dataset_ref.startswith('local/'):
            return self._generate_local_dataset(dataset_ref)
        else:
            return self._download_kaggle_dataset(dataset_ref, file_name)
    
    def _generate_local_dataset(self, dataset_ref):
        """Generate local synthetic dataset"""
        try:
            dataset_name = dataset_ref.replace('local/', '')
            dataset_folder = os.path.join(self.upload_folder, f'generated_{dataset_name}')
            os.makedirs(dataset_folder, exist_ok=True)
            
            if dataset_name == 'sample':
                csv_file = os.path.join(dataset_folder, 'sample_intrusion.csv')
                self._generate_sample_dataset(csv_file)
            elif dataset_name == 'synthetic':
                csv_file = os.path.join(dataset_folder, 'synthetic_network.csv')
                self._generate_synthetic_dataset(csv_file)
            
            return {
                'dataset_name': f'generated_{dataset_name}',
                'csv_files': [csv_file],
                'dataset_folder': dataset_folder
            }
            
        except Exception as e:
            raise Exception(f"Local dataset generation failed: {str(e)}")
    
    def _generate_sample_dataset(self, csv_file):
        """Generate sample intrusion detection dataset"""
        import random
        import numpy as np
        
        # Generate realistic network data
        protocols = ['TCP', 'UDP', 'ICMP']
        services = ['http', 'ftp', 'ssh', 'smtp', 'dns', 'telnet']
        attack_types = ['normal', 'dos', 'probe', 'r2l', 'u2r']
        
        data = []
        for i in range(1000):
            is_attack = random.random() < 0.3  # 30% attacks
            attack_type = random.choice(attack_types) if is_attack else 'normal'
            
            row = {
                'duration': random.uniform(0, 100),
                'protocol': random.choice(protocols),
                'service': random.choice(services),
                'src_bytes': random.randint(0, 10000) if attack_type == 'normal' else random.randint(1000, 50000),
                'dst_bytes': random.randint(0, 10000),
                'count': random.randint(1, 100),
                'srv_count': random.randint(1, 50),
                'serror_rate': random.uniform(0, 1) if attack_type in ['dos', 'probe'] else 0,
                'srv_serror_rate': random.uniform(0, 1) if attack_type in ['dos', 'probe'] else 0,
                'rerror_rate': random.uniform(0, 1) if attack_type in ['r2l', 'u2r'] else 0,
                'srv_rerror_rate': random.uniform(0, 1) if attack_type in ['r2l', 'u2r'] else 0,
                'same_srv_rate': random.uniform(0, 1),
                'diff_srv_rate': random.uniform(0, 1),
                'dst_host_count': random.randint(1, 255),
                'dst_host_srv_count': random.randint(1, 100),
                'dst_host_same_srv_rate': random.uniform(0, 1),
                'dst_host_diff_srv_rate': random.uniform(0, 1),
                'dst_host_serror_rate': random.uniform(0, 1) if attack_type in ['dos', 'probe'] else 0,
                'dst_host_srv_serror_rate': random.uniform(0, 1) if attack_type in ['dos', 'probe'] else 0,
                'label': attack_type
            }
            data.append(row)
        
        df = pd.DataFrame(data)
        df.to_csv(csv_file, index=False)
        print(f"Generated sample dataset with {len(data)} records")
    
    def _generate_synthetic_dataset(self, csv_file):
        """Generate synthetic network traffic dataset"""
        import random
        import numpy as np
        
        # Generate more realistic network traffic
        data = []
        for i in range(2000):
            # Simulate different traffic patterns
            traffic_type = random.choices(
                ['normal', 'port_scan', 'dos_attack', 'data_exfiltration'],
                weights=[0.7, 0.1, 0.15, 0.05]
            )[0]
            
            if traffic_type == 'normal':
                src_ip = f"192.168.1.{random.randint(1, 254)}"
                dst_ip = f"10.0.0.{random.randint(1, 254)}"
                protocol = random.choice(['TCP', 'UDP'])
                port = random.choice([80, 443, 22, 53, 25])
                bytes_size = random.randint(64, 1500)
            elif traffic_type == 'port_scan':
                src_ip = f"192.168.1.{random.randint(1, 254)}"
                dst_ip = f"10.0.0.{random.randint(1, 254)}"
                protocol = 'TCP'
                port = random.randint(1, 1024)
                bytes_size = random.randint(40, 100)
            elif traffic_type == 'dos_attack':
                src_ip = f"192.168.1.{random.randint(1, 254)}"
                dst_ip = f"10.0.0.{random.randint(1, 254)}"
                protocol = random.choice(['TCP', 'UDP'])
                port = random.choice([80, 443])
                bytes_size = random.randint(1000, 8000)
            else:  # data_exfiltration
                src_ip = f"10.0.0.{random.randint(1, 254)}"
                dst_ip = f"192.168.1.{random.randint(1, 254)}"
                protocol = 'TCP'
                port = random.choice([22, 443, 993])
                bytes_size = random.randint(5000, 10000)
            
            row = {
                'src_ip': src_ip,
                'dst_ip': dst_ip,
                'protocol': protocol,
                'port': port,
                'bytes': bytes_size,
                'timestamp': random.uniform(0, 86400),  # Time of day in seconds
                'duration': random.uniform(0.001, 1.0),
                'packets': random.randint(1, 100),
                'flags': random.choice(['SYN', 'ACK', 'FIN', 'RST', 'PSH', 'URG']),
                'traffic_type': traffic_type,
                'is_attack': 0 if traffic_type == 'normal' else 1
            }
            data.append(row)
        
        df = pd.DataFrame(data)
        df.to_csv(csv_file, index=False)
        print(f"Generated synthetic dataset with {len(data)} records")
    
    def _download_kaggle_dataset(self, dataset_ref, file_name=None):
        """Download dataset from Kaggle"""
        if not self.authenticated:
            raise Exception("Please authenticate with Kaggle first")
        
        try:
            # Create dataset folder
            dataset_name = dataset_ref.replace('/', '_')
            dataset_folder = os.path.join(self.upload_folder, dataset_name)
            os.makedirs(dataset_folder, exist_ok=True)
            
            # Download dataset
            api = self._get_api()
            api.dataset_download_files(
                dataset_ref, 
                path=dataset_folder,
                unzip=True
            )
            
            # Find CSV files
            csv_files = []
            for root, dirs, files in os.walk(dataset_folder):
                for file in files:
                    if file.endswith('.csv'):
                        csv_files.append(os.path.join(root, file))
            
            if not csv_files:
                raise Exception("No CSV files found in dataset")
            
            return {
                'dataset_name': dataset_name,
                'csv_files': csv_files,
                'dataset_folder': dataset_folder
            }
            
        except Exception as e:
            raise Exception(f"Dataset download failed: {str(e)}")
    
    def get_popular_intrusion_datasets(self):
        """Get popular intrusion detection datasets (with fallbacks)"""
        # Fallback datasets that can be downloaded directly
        fallback_datasets = [
            {
                'ref': 'local/sample',
                'title': 'Sample Intrusion Detection Dataset',
                'description': 'A sample dataset for testing intrusion detection algorithms',
                'size': '5MB',
                'files': ['sample_intrusion.csv'],
                'features': ['duration', 'protocol', 'service', 'src_bytes', 'dst_bytes'],
                'download_url': None,  # Generate locally
                'requires_auth': False
            },
            {
                'ref': 'local/synthetic',
                'title': 'Synthetic Network Traffic Dataset',
                'description': 'Synthetically generated network traffic with attack patterns',
                'size': '10MB',
                'files': ['synthetic_network.csv'],
                'features': ['src_ip', 'dst_ip', 'protocol', 'port', 'bytes'],
                'download_url': None,  # Generate locally
                'requires_auth': False
            }
        ]
        
        # Kaggle datasets (require authentication)
        kaggle_datasets = [
            {
                'ref': 'cic/cicids2017',
                'title': 'CICIDS2017 Dataset',
                'description': 'Canadian Institute for Cybersecurity Intrusion Detection System 2017',
                'size': '1.2GB',
                'files': ['Monday-WorkingHours.pcap_ISCX.csv', 'Tuesday-WorkingHours.pcap_ISCX.csv'],
                'features': ['Flow ID', 'Source IP', 'Destination IP', 'Protocol', 'Flow Duration'],
                'download_url': None,
                'requires_auth': True
            },
            {
                'ref': 'hassan06/nslkdd',
                'title': 'NSL-KDD Dataset',
                'description': 'Network Security Laboratory-Knowledge Discovery and Data Mining',
                'size': '150MB',
                'files': ['KDDTrain+.txt', 'KDDTest+.txt'],
                'features': ['duration', 'protocol_type', 'service', 'flag', 'src_bytes'],
                'download_url': None,
                'requires_auth': True
            },
            {
                'ref': 'mrwellsd/unsw-nb15',
                'title': 'UNSW-NB15 Dataset',
                'description': 'UNSW-NB15 network intrusion dataset created by the Australian Cyber Security Centre',
                'size': '2.3GB',
                'files': ['UNSW-NB15_1.csv', 'UNSW-NB15_2.csv', 'UNSW-NB15_3.csv', 'UNSW-NB15_4.csv'],
                'features': ['srcip', 'sport', 'dstip', 'dsport', 'proto'],
                'download_url': None,
                'requires_auth': True
            }
        ]
        
        # Return fallback datasets if not authenticated, otherwise return all
        if self.authenticated:
            return kaggle_datasets + fallback_datasets
        else:
            return fallback_datasets
    
    def analyze_downloaded_dataset(self, csv_file):
        """Analyze a downloaded CSV file"""
        try:
            df = pd.read_csv(csv_file, nrows=1000)  # Sample first 1000 rows
            
            analysis = {
                'file_path': csv_file,
                'file_name': os.path.basename(csv_file),
                'shape_sample': df.shape,
                'columns': list(df.columns),
                'dtypes': df.dtypes.to_dict(),
                'null_values': df.isnull().sum().to_dict(),
                'sample_data': df.head().to_dict('records'),
                'numeric_columns': list(df.select_dtypes(include=['number']).columns),
                'categorical_columns': list(df.select_dtypes(include=['object']).columns)
            }
            
            # Identify potential target columns
            possible_targets = ['label', 'class', 'attack_type', 'attack', 'target', 'Category']
            found_targets = [col for col in possible_targets if col in df.columns]
            if found_targets:
                analysis['suggested_target'] = found_targets[0]
                analysis['target_values'] = df[found_targets[0]].value_counts().to_dict()
            
            return analysis
            
        except Exception as e:
            raise Exception(f"Dataset analysis failed: {str(e)}")
    
    def prepare_dataset_for_training(self, csv_file, target_column=None):
        """Prepare dataset for ML training"""
        try:
            # Read full dataset
            df = pd.read_csv(csv_file)
            
            # Basic cleaning
            df = df.dropna()
            df = df.reset_index(drop=True)
            
            # Save prepared dataset
            prepared_file = csv_file.replace('.csv', '_prepared.csv')
            df.to_csv(prepared_file, index=False)
            
            return {
                'original_file': csv_file,
                'prepared_file': prepared_file,
                'total_rows': len(df),
                'columns': list(df.columns),
                'target_column': target_column
            }
            
        except Exception as e:
            raise Exception(f"Dataset preparation failed: {str(e)}")
