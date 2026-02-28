import React, { useState, useEffect } from 'react';
import { Card, Form, Switch, Button, Input, Select, InputNumber, Alert, Divider, Space, message } from 'antd';
import { SaveOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

const Settings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    // Detection Settings
    autoDetection: false,
    sensitivityLevel: 'medium',
    confidenceThreshold: 0.7,
    
    // Alert Settings
    emailAlerts: true,
    smsAlerts: false,
    alertEmail: '',
    
    // Model Settings
    autoRetraining: false,
    retrainingInterval: 7, // days
    modelSelection: 'ensemble',
    
    // Data Settings
    maxFileSize: 16, // MB
    dataRetention: 30, // days
    autoBackup: true,
    
    // System Settings
    enableLogging: true,
    logLevel: 'info',
    apiRateLimit: 100,
    
    // Notification Settings
    realTimeAlerts: true,
    dailyReports: false,
    weeklyReports: true,
  });

  useEffect(() => {
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('ids_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
      form.setFieldsValue(parsed);
    } else {
      form.setFieldsValue(settings);
    }
  }, []);

  const handleSave = async (values) => {
    setLoading(true);
    try {
      // Save to localStorage (in a real app, save to backend)
      localStorage.setItem('ids_settings', JSON.stringify(values));
      setSettings(values);
      message.success('Settings saved successfully!');
    } catch (error) {
      message.error('Failed to save settings');
      console.error('Settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    message.info('Settings reset to defaults');
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ids_settings.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          setSettings(imported);
          form.setFieldsValue(imported);
          message.success('Settings imported successfully!');
        } catch (error) {
          message.error('Invalid settings file');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div>
      <Card title="System Settings" style={{ marginBottom: 24 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={settings}
        >
          <Divider>Detection Settings</Divider>
          
          <Form.Item
            name="autoDetection"
            label="Automatic Detection"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="sensitivityLevel"
            label="Detection Sensitivity"
          >
            <Select>
              <Option value="low">Low</Option>
              <Option value="medium">Medium</Option>
              <Option value="high">High</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="confidenceThreshold"
            label="Confidence Threshold"
            extra="Minimum confidence level for threat detection"
          >
            <InputNumber
              min={0}
              max={1}
              step={0.1}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Divider>Alert Settings</Divider>

          <Form.Item
            name="emailAlerts"
            label="Email Alerts"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="smsAlerts"
            label="SMS Alerts"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="alertEmail"
            label="Alert Email Address"
            rules={[
              { type: 'email', message: 'Please enter a valid email address' }
            ]}
          >
            <Input placeholder="admin@example.com" />
          </Form.Item>

          <Divider>Model Settings</Divider>

          <Form.Item
            name="autoRetraining"
            label="Automatic Model Retraining"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="retrainingInterval"
            label="Retraining Interval (days)"
          >
            <InputNumber min={1} max={30} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="modelSelection"
            label="Default Model"
          >
            <Select>
              <Option value="ensemble">Ensemble (Recommended)</Option>
              <Option value="random_forest">Random Forest</Option>
              <Option value="xgboost">XGBoost</Option>
              <Option value="lightgbm">LightGBM</Option>
              <Option value="svm">SVM</Option>
            </Select>
          </Form.Item>

          <Divider>Data Settings</Divider>

          <Form.Item
            name="maxFileSize"
            label="Maximum File Size (MB)"
          >
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="dataRetention"
            label="Data Retention Period (days)"
          >
            <InputNumber min={1} max={365} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="autoBackup"
            label="Automatic Backup"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Divider>System Settings</Divider>

          <Form.Item
            name="enableLogging"
            label="Enable Logging"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="logLevel"
            label="Log Level"
          >
            <Select>
              <Option value="debug">Debug</Option>
              <Option value="info">Info</Option>
              <Option value="warning">Warning</Option>
              <Option value="error">Error</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="apiRateLimit"
            label="API Rate Limit (requests/minute)"
          >
            <InputNumber min={10} max={1000} style={{ width: '100%' }} />
          </Form.Item>

          <Divider>Notification Settings</Divider>

          <Form.Item
            name="realTimeAlerts"
            label="Real-time Alerts"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="dailyReports"
            label="Daily Reports"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="weeklyReports"
            label="Weekly Reports"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
            >
              Save Settings
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
            >
              Reset to Defaults
            </Button>
            <Button
              onClick={exportSettings}
            >
              Export Settings
            </Button>
            <Button
              onClick={() => document.getElementById('import-settings').click()}
            >
              Import Settings
            </Button>
            <input
              id="import-settings"
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={importSettings}
            />
          </Space>
        </Form>
      </Card>

      <Card title="System Information">
        <div style={{ lineHeight: '1.8' }}>
          <p><strong>Version:</strong> 1.0.0</p>
          <p><strong>Backend:</strong> Flask API</p>
          <p><strong>Frontend:</strong> React with Ant Design</p>
          <p><strong>Machine Learning:</strong> Scikit-learn, XGBoost, LightGBM</p>
          <p><strong>Database:</strong> SQLite</p>
          <p><strong>Supported Formats:</strong> CSV</p>
          <p><strong>Max File Size:</strong> {settings.maxFileSize} MB</p>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
