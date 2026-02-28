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
            os.environ['KAGGLE_USERNAME'] = username
            os.environ['KAGGLE_KEY'] = key
            
            # Test authentication
            api = self._get_api()
            api.authenticate()
            self.authenticated = True
            return True
        except Exception as e:
            # Don't raise exception, just return False
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
        """Get popular intrusion detection datasets from Kaggle"""
        popular_datasets = [
            {
                'ref': 'cicdataset/cicids2017',
                'title': 'CICIDS2017',
                'description': 'Canadian Institute for Cybersecurity Intrusion Detection System 2017 dataset',
                'size': 'Large',
                'features': ['Network traffic', 'DDoS attacks', 'Port scanning', 'Botnet traffic']
            },
            {
                'ref': 'hassan06/nslkdd',
                'title': 'NSL-KDD',
                'description': 'Network Security Laboratory-Knowledge Discovery Dataset',
                'size': 'Medium',
                'features': ['Network attacks', 'DoS', 'Probe', 'R2L', 'U2R attacks']
            },
            {
                'ref': 'sxhilton/unswnb15',
                'title': 'UNSW-NB15',
                'description': 'UNSW-NB15 dataset for network intrusion detection',
                'size': 'Large',
                'features': ['Modern attacks', 'Exploitation', 'Analysis', 'Worms', 'Shellcode']
            },
            {
                'ref': 'mrwellsd/unswnb15',
                'title': 'UNSW-NB15 Clean',
                'description': 'Cleaned version of UNSW-NB15 dataset',
                'size': 'Medium',
                'features': ['Preprocessed', 'Labeled', 'Ready for ML']
            }
        ]
        return popular_datasets
    
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
