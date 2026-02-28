# 🎯 Recommended Dataset for Training

## **Best Choice: CICIDS2017** 
- **Why**: Most comprehensive, modern, realistic attack patterns
- **Size**: ~1.2GB (manageable)
- **Features**: Complete network flow data with labels
- **Attacks**: DoS, DDoS, PortScan, Web Attack, Infiltration, Botnet, etc.

## **📥 Download Instructions**
1. Go to: https://www.kaggle.com/datasets/cic/cicids2017
2. Download any day's CSV file (Monday is recommended for training)
3. Save as: `cicids2017.csv`

## **📁 Exact Upload Location**
```
c:\Users\siddhesh\Documents\Intrusion Detection\Server\uploads\cicids2017.csv
```

## **🔧 System Changes Made**
- ✅ Removed dataset upload functionality
- ✅ Removed Kaggle integration
- ✅ Simplified to local file loading
- ✅ Kept model training and real-time detection
- ✅ Focused on core intrusion detection

## **🚀 How to Use**

### **Step 1: Place Dataset**
1. Download CICIDS2017 from Kaggle
2. Rename to `cicids2017.csv`
3. Place in: `uploads/` folder

### **Step 2: Train Models**
1. Go to Model Training page
2. Enter filename: `cicids2017.csv`
3. Click "Load Dataset"
4. Click "Train Models"

### **Step 3: Real-time Detection**
1. Go to Network Capture page
2. Start real-time monitoring
3. Models will detect threats on live network data

## **📊 Expected Dataset Columns**
CICIDS2017 should have these key columns:
- `Flow ID`, `Source IP`, `Destination IP`
- `Protocol`, `Flow Duration`, `Total Fwd Packets`
- `Total Backward Packets`, `Flow Bytes/s`
- `Flow Packets/s`, `Label` (attack/benign)

## **⚡ Quick Start**
1. Download: https://www.kaggle.com/datasets/cic/cicids2017
2. Save as: `uploads/cicids2017.csv`
3. Run: `python run.py`
4. Open: http://localhost:3000
5. Train models → Start real-time detection

The system is now streamlined and ready for your dataset! 🎯
