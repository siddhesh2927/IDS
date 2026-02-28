import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import xgboost as xgb
import lightgbm as lgb
from sklearn.neural_network import MLPClassifier
import joblib
import warnings
warnings.filterwarnings('ignore')

class MLModels:
    def __init__(self):
        self.models = {}
        self.model_performance = {}
        self.ensemble_model = None
        
    def train_all_models(self, X_train, X_test, y_train, y_test):
        """Train multiple ML models and return performance metrics"""
        results = {}
        
        # Define models to train
        models_config = {
            'random_forest': RandomForestClassifier(n_estimators=100, random_state=42),
            'xgboost': xgb.XGBClassifier(random_state=42, eval_metric='logloss'),
            'lightgbm': lgb.LGBMClassifier(random_state=42, verbose=-1),
            'svm': SVC(random_state=42, probability=True),
            'logistic_regression': LogisticRegression(random_state=42, max_iter=1000),
            'decision_tree': DecisionTreeClassifier(random_state=42),
            'naive_bayes': GaussianNB(),
            'knn': KNeighborsClassifier(),
            'neural_network': MLPClassifier(random_state=42, max_iter=1000, hidden_layer_sizes=(100, 50))
        }
        
        # Train each model
        for name, model in models_config.items():
            try:
                print(f"Training {name}...")
                model.fit(X_train, y_train)
                
                # Make predictions
                y_pred = model.predict(X_test)
                y_proba = model.predict_proba(X_test)[:, 1] if hasattr(model, 'predict_proba') else None
                
                # Calculate metrics
                metrics = self._calculate_metrics(y_test, y_pred, y_proba)
                
                # Store model and performance
                self.models[name] = model
                self.model_performance[name] = metrics
                
                results[name] = {
                    'metrics': metrics,
                    'classification_report': classification_report(y_test, y_pred, output_dict=True),
                    'confusion_matrix': confusion_matrix(y_test, y_pred).tolist()
                }
                
            except Exception as e:
                print(f"Error training {name}: {str(e)}")
                results[name] = {'error': str(e)}
        
        # Train ensemble model
        try:
            self.ensemble_model = self._create_ensemble(X_train, y_train)
            ensemble_pred = self.ensemble_model.predict(X_test)
            ensemble_proba = self.ensemble_model.predict_proba(X_test)[:, 1]
            
            ensemble_metrics = self._calculate_metrics(y_test, ensemble_pred, ensemble_proba)
            results['ensemble'] = {
                'metrics': ensemble_metrics,
                'classification_report': classification_report(y_test, ensemble_pred, output_dict=True),
                'confusion_matrix': confusion_matrix(y_test, ensemble_pred).tolist()
            }
            
        except Exception as e:
            print(f"Error training ensemble: {str(e)}")
            results['ensemble'] = {'error': str(e)}
        
        return results
    
    def _create_ensemble(self, X_train, y_train):
        """Create an ensemble model using voting"""
        from sklearn.ensemble import VotingClassifier
        
        # Select top performing models for ensemble
        base_models = []
        for name, model in self.models.items():
            if name in ['random_forest', 'xgboost', 'lightgbm', 'logistic_regression']:
                base_models.append((name, model))
        
        if len(base_models) >= 2:
            ensemble = VotingClassifier(estimators=base_models, voting='soft')
            ensemble.fit(X_train, y_train)
            return ensemble
        else:
            # Fallback to best single model
            best_model_name = max(self.model_performance.keys(), 
                                key=lambda x: self.model_performance[x]['f1_score'])
            return self.models[best_model_name]
    
    def _calculate_metrics(self, y_true, y_pred, y_proba=None):
        """Calculate performance metrics"""
        metrics = {
            'accuracy': float(accuracy_score(y_true, y_pred)),
            'precision': float(precision_score(y_true, y_pred, average='weighted', zero_division=0)),
            'recall': float(recall_score(y_true, y_pred, average='weighted', zero_division=0)),
            'f1_score': float(f1_score(y_true, y_pred, average='weighted', zero_division=0))
        }
        
        if y_proba is not None and len(np.unique(y_true)) == 2:
            try:
                metrics['auc_roc'] = float(roc_auc_score(y_true, y_proba))
            except:
                metrics['auc_roc'] = 0.0
        
        return metrics
    
    def predict(self, X, model_type='ensemble'):
        """Make predictions using specified model"""
        try:
            if model_type == 'ensemble':
                if self.ensemble_model is None:
                    raise Exception("Ensemble model not trained")
                return self.ensemble_model.predict(X)
            elif model_type in self.models:
                return self.models[model_type].predict(X)
            else:
                raise Exception(f"Model {model_type} not available")
                
        except Exception as e:
            raise Exception(f"Error making predictions: {str(e)}")
    
    def predict_proba(self, X, model_type='ensemble'):
        """Get prediction probabilities"""
        try:
            if model_type == 'ensemble':
                if self.ensemble_model is None:
                    raise Exception("Ensemble model not trained")
                return self.ensemble_model.predict_proba(X)
            elif model_type in self.models:
                model = self.models[model_type]
                if hasattr(model, 'predict_proba'):
                    return model.predict_proba(X)
                else:
                    # Fallback for models without probability
                    predictions = model.predict(X)
                    n_classes = len(np.unique(predictions))
                    proba = np.zeros((len(predictions), n_classes))
                    for i, pred in enumerate(predictions):
                        proba[i, pred] = 1.0
                    return proba
            else:
                raise Exception(f"Model {model_type} not available")
                
        except Exception as e:
            raise Exception(f"Error getting probabilities: {str(e)}")
    
    def get_feature_importance(self, model_type='random_forest'):
        """Get feature importance from tree-based models"""
        try:
            if model_type in self.models:
                model = self.models[model_type]
                if hasattr(model, 'feature_importances_'):
                    return model.feature_importances_.tolist()
                else:
                    return None
            else:
                return None
                
        except Exception as e:
            raise Exception(f"Error getting feature importance: {str(e)}")
    
    def save_models(self, model_folder):
        """Save all trained models"""
        import os
        os.makedirs(model_folder, exist_ok=True)
        
        # Save individual models
        for name, model in self.models.items():
            model_path = os.path.join(model_folder, f"{name}.joblib")
            joblib.dump(model, model_path)
        
        # Save ensemble model
        if self.ensemble_model is not None:
            ensemble_path = os.path.join(model_folder, "ensemble.joblib")
            joblib.dump(self.ensemble_model, ensemble_path)
        
        # Save performance metrics
        performance_path = os.path.join(model_folder, "performance.json")
        import json
        with open(performance_path, 'w') as f:
            json.dump(self.model_performance, f, indent=2)
    
    def load_models(self, model_folder):
        """Load saved models"""
        import os
        import json
        
        # Load individual models
        model_files = [f for f in os.listdir(model_folder) if f.endswith('.joblib')]
        for model_file in model_files:
            model_name = model_file.replace('.joblib', '')
            model_path = os.path.join(model_folder, model_file)
            self.models[model_name] = joblib.load(model_path)
        
        # Load performance metrics
        performance_path = os.path.join(model_folder, "performance.json")
        if os.path.exists(performance_path):
            with open(performance_path, 'r') as f:
                self.model_performance = json.load(f)
    
    def get_available_models(self, model_folder):
        """Get list of available trained models"""
        import os
        models = []
        
        if os.path.exists(model_folder):
            model_files = [f for f in os.listdir(model_folder) if f.endswith('.joblib')]
            models = [f.replace('.joblib', '') for f in model_files]
        
        return models
    
    def get_model_summary(self):
        """Get summary of all trained models and their performance"""
        summary = {}
        for name, metrics in self.model_performance.items():
            summary[name] = {
                'accuracy': metrics.get('accuracy', 0),
                'f1_score': metrics.get('f1_score', 0),
                'precision': metrics.get('precision', 0),
                'recall': metrics.get('recall', 0)
            }
        
        return summary
