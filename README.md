# Intrusion Detection System

A comprehensive network intrusion detection system built with machine learning capabilities for real-time threat analysis and detection.

## Features

- **Data Upload & Analysis**: Upload network traffic datasets in CSV format
- **Multiple ML Models**: Train and use various ML algorithms (Random Forest, XGBoost, LightGBM, SVM, Neural Networks)
- **Real-time Detection**: Analyze network data for potential threats
- **Interactive Dashboard**: Visualize detection results and system statistics
- **Historical Analysis**: Track detection history and trends
- **Configurable Settings**: Customize detection parameters and alert thresholds

## Architecture

### Backend (Python Flask)
- **Flask API**: RESTful API for data processing and ML operations
- **Machine Learning**: Scikit-learn, XGBoost, LightGBM, TensorFlow
- **Data Processing**: Pandas, NumPy for data manipulation
- **Database**: SQLite for storing results and logs

### Frontend (React)
- **React 18**: Modern UI framework
- **Ant Design**: Professional UI components
- **Charts**: Recharts for data visualization
- **Responsive Design**: Works on desktop and mobile devices

## Installation

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to the Server directory:
```bash
cd Server
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
```bash
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Start the server:
```bash
python run.py
```

The API will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the Client directory:
```bash
cd Client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The web interface will be available at `http://localhost:3000`

## Usage

### 1. Upload Dataset
- Navigate to the "Data Upload" page
- Drag and drop or select a CSV file containing network data
- View dataset analysis and column information

### 2. Train Models
- Go to the "Model Training" page
- Select the uploaded dataset
- Click "Start Training" to train multiple ML models
- Review performance metrics and visualizations

### 3. Threat Detection
- Navigate to "Threat Detection"
- Select dataset and model for analysis
- Click "Start Threat Detection" to analyze for threats
- Review detailed results and threat probabilities

### 4. View History
- Check "Detection History" for past analyses
- Export results to CSV
- View trends and statistics

## API Endpoints

### Data Management
- `POST /upload` - Upload and analyze dataset
- `GET /models` - Get available trained models

### Model Operations
- `POST /train` - Train ML models on dataset
- `POST /predict` - Make predictions on new data

### Analytics
- `GET /stats` - Get system statistics
- `GET /history` - Get detection history

## Dataset Format

The system expects CSV files with network traffic data. Typical columns include:
- Source/Destination IP addresses
- Port numbers
- Protocol types
- Packet sizes
- Timestamps
- Traffic features
- Attack labels (for training)

## Supported Models

- **Random Forest**: Ensemble decision trees
- **XGBoost**: Gradient boosting framework
- **LightGBM**: Fast gradient boosting
- **SVM**: Support Vector Machine
- **Neural Networks**: Multi-layer perceptron
- **Ensemble**: Combined model approach

## Configuration

### Environment Variables (.env)
```
FLASK_APP=app.py
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///intrusion_detection.db
```

### Settings Configuration
- Detection sensitivity levels
- Alert thresholds
- Model preferences
- Data retention policies

## Performance Metrics

The system tracks:
- **Accuracy**: Overall prediction accuracy
- **Precision**: True positive rate
- **Recall**: Detection coverage
- **F1 Score**: Harmonic mean of precision and recall
- **AUC-ROC**: Area under ROC curve

## Security Features

- Input validation and sanitization
- File upload restrictions
- Rate limiting
- Secure API endpoints
- Data encryption (in production)

## Troubleshooting

### Common Issues

1. **Server won't start**
   - Check Python version compatibility
   - Verify all dependencies are installed
   - Check port availability

2. **File upload fails**
   - Ensure CSV format is correct
   - Check file size limits (16MB default)
   - Verify file permissions

3. **Model training errors**
   - Check dataset quality and format
   - Ensure sufficient training data
   - Review memory requirements

4. **Frontend connection issues**
   - Verify backend server is running
   - Check CORS configuration
   - Ensure correct API endpoints

## Development

### Adding New Models
1. Update `ml_models.py` with new model class
2. Add to training pipeline
3. Update frontend model selection

### Extending API
1. Add new routes in `app.py`
2. Implement business logic
3. Update frontend components

### Database Schema
- SQLite database in `intrusion_detection.db`
- Tables: training_results, prediction_results, system_logs, model_registry

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes and test
4. Submit pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Review API documentation
- Create an issue in the repository

---

**Note**: This is a demonstration system. For production use, consider additional security measures, scalability improvements, and professional deployment practices.
