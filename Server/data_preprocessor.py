import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder, MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer
import warnings
warnings.filterwarnings('ignore')

class DataPreprocessor:
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.imputer = SimpleImputer(strategy='mean')
        self.feature_columns = []
        self.target_column = None
        
    def analyze_dataset(self, filepath):
        """Analyze the dataset and return basic information"""
        try:
            df = pd.read_csv(filepath)
            
            analysis = {
                "shape": df.shape,
                "columns": list(df.columns),
                "dtypes": df.dtypes.to_dict(),
                "null_values": df.isnull().sum().to_dict(),
                "memory_usage": df.memory_usage(deep=True).sum(),
                "numeric_columns": list(df.select_dtypes(include=[np.number]).columns),
                "categorical_columns": list(df.select_dtypes(include=['object']).columns),
                "sample_data": df.head().to_dict('records')
            }
            
            # Try to identify target column (common names for attack labels)
            possible_targets = ['label', 'class', 'attack_type', 'attack', 'target']
            for col in possible_targets:
                if col in df.columns:
                    analysis['suggested_target'] = col
                    break
            
            return analysis
            
        except Exception as e:
            raise Exception(f"Error analyzing dataset: {str(e)}")
    
    def preprocess_data(self, filepath, target_column=None, test_size=0.2):
        """Preprocess the dataset for ML training"""
        try:
            df = pd.read_csv(filepath)
            
            # Auto-detect target column if not provided
            if target_column is None:
                possible_targets = ['label', 'class', 'attack_type', 'attack', 'target']
                for col in possible_targets:
                    if col in df.columns:
                        target_column = col
                        break
                
                if target_column is None:
                    # Assume last column is target
                    target_column = df.columns[-1]
            
            self.target_column = target_column
            
            # Separate features and target
            X = df.drop(columns=[target_column])
            y = df[target_column]
            
            # Store original feature columns
            self.feature_columns = list(X.columns)
            
            # Handle missing values
            X = pd.DataFrame(self.imputer.fit_transform(X), columns=X.columns)
            
            # Encode categorical variables
            categorical_cols = X.select_dtypes(include=['object']).columns
            for col in categorical_cols:
                if col not in self.label_encoders:
                    self.label_encoders[col] = LabelEncoder()
                X[col] = self.label_encoders[col].fit_transform(X[col].astype(str))
            
            # Encode target variable if it's categorical
            if y.dtype == 'object':
                if 'target_encoder' not in self.label_encoders:
                    self.label_encoders['target_encoder'] = LabelEncoder()
                y = self.label_encoders['target_encoder'].fit_transform(y)
            
            # Scale features
            X_scaled = pd.DataFrame(self.scaler.fit_transform(X), columns=X.columns)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y, test_size=test_size, random_state=42, stratify=y
            )
            
            return X_train, X_test, y_train, y_test
            
        except Exception as e:
            raise Exception(f"Error preprocessing data: {str(e)}")
    
    def transform_data(self, df):
        """Transform new data using fitted preprocessors"""
        try:
            # Make a copy to avoid modifying original
            X = df.copy()
            
            # Remove target column if present
            if self.target_column and self.target_column in X.columns:
                X = X.drop(columns=[self.target_column])
            
            # Handle missing values
            X = pd.DataFrame(self.imputer.transform(X), columns=X.columns)
            
            # Encode categorical variables
            categorical_cols = X.select_dtypes(include=['object']).columns
            for col in categorical_cols:
                if col in self.label_encoders:
                    X[col] = self.label_encoders[col].transform(X[col].astype(str))
                else:
                    # Handle unseen categories
                    X[col] = 0
            
            # Scale features
            X_scaled = pd.DataFrame(self.scaler.transform(X), columns=X.columns)
            
            return X_scaled
            
        except Exception as e:
            raise Exception(f"Error transforming data: {str(e)}")
    
    def get_feature_names(self):
        """Get the names of processed features"""
        return self.feature_columns
    
    def get_target_classes(self):
        """Get the target class names"""
        if 'target_encoder' in self.label_encoders:
            return self.label_encoders['target_encoder'].classes_.tolist()
        return None
    
    def save_preprocessors(self, filepath):
        """Save fitted preprocessors"""
        import joblib
        preprocessors = {
            'scaler': self.scaler,
            'label_encoders': self.label_encoders,
            'imputer': self.imputer,
            'feature_columns': self.feature_columns,
            'target_column': self.target_column
        }
        joblib.dump(preprocessors, filepath)
    
    def load_preprocessors(self, filepath):
        """Load fitted preprocessors"""
        import joblib
        preprocessors = joblib.load(filepath)
        self.scaler = preprocessors['scaler']
        self.label_encoders = preprocessors['label_encoders']
        self.imputer = preprocessors['imputer']
        self.feature_columns = preprocessors['feature_columns']
        self.target_column = preprocessors['target_column']
