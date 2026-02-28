import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Table, Tag, Progress, Alert, Statistic, Row, Col, Space, message } from 'antd';
import { SecurityScanOutlined, PlayCircleOutlined, ExclamationCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';

const { Option } = Select;

const ThreatDetection = () => {
  const [availableFiles, setAvailableFiles] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedModel, setSelectedModel] = useState('ensemble');
  const [detecting, setDetecting] = useState(false);
  const [detectionResults, setDetectionResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAvailableModels();
    // In a real app, you'd fetch available files from the server
    setAvailableFiles([
      { name: 'network_traffic.csv', size: '2.5 MB' },
      { name: 'intrusion_data.csv', size: '1.8 MB' },
    ]);
  }, []);

  const fetchAvailableModels = async () => {
    try {
      const response = await axios.get('http://localhost:5000/models');
      setAvailableModels(response.data.models);
    } catch (err) {
      console.error('Error fetching models:', err);
    }
  };

  const handleDetect = async () => {
    if (!selectedFile) {
      message.error('Please select a file first');
      return;
    }

    setDetecting(true);
    setError(null);

    try {
      const response = await axios.post('http://localhost:5000/predict', {
        filename: selectedFile,
        model_type: selectedModel
      });

      setDetectionResults(response.data);
      message.success('Threat detection completed!');
    } catch (err) {
      setError('Detection failed: ' + (err.response?.data?.error || err.message));
      message.error('Detection failed');
    } finally {
      setDetecting(false);
    }
  };

  const getThreatLevel = (percentage) => {
    if (percentage > 20) return { level: 'High', color: '#f5222d' };
    if (percentage > 10) return { level: 'Medium', color: '#faad14' };
    return { level: 'Low', color: '#52c41a' };
  };

  const columns = [
    {
      title: 'Record ID',
      dataIndex: 'id',
      key: 'id',
      render: (_, record, index) => index + 1,
    },
    {
      title: 'Threat Prediction',
      dataIndex: 'threat_prediction',
      key: 'threat_prediction',
      render: (value) => (
        <Tag color={value === 1 ? 'red' : 'green'}>
          {value === 1 ? 'THREAT' : 'BENIGN'}
        </Tag>
      ),
    },
    {
      title: 'Threat Probability',
      dataIndex: 'threat_probability',
      key: 'threat_probability',
      render: (value) => (
        <Progress
          percent={(value * 100).toFixed(1)}
          size="small"
          strokeColor={value > 0.7 ? '#f5222d' : value > 0.3 ? '#faad14' : '#52c41a'}
          format={() => `${(value * 100).toFixed(1)}%`}
        />
      ),
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => new Date(timestamp).toLocaleString(),
    },
  ];

  const getTableData = () => {
    if (!detectionResults?.detailed_data) return [];

    return detectionResults.detailed_data.map((record, index) => ({
      key: index,
      ...record,
    }));
  };

  const pieData = detectionResults ? [
    { name: 'Threats', value: detectionResults.summary.threats_detected, color: '#f5222d' },
    { name: 'Benign', value: detectionResults.summary.benign_records, color: '#52c41a' }
  ] : [];

  const threatLevel = detectionResults ? 
    getThreatLevel(detectionResults.summary.threat_percentage) : null;

  return (
    <div>
      <Card title="Threat Detection Configuration" style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col span={12}>
              <label style={{ display: 'block', marginBottom: 8 }}>Select Dataset:</label>
              <Select
                style={{ width: '100%' }}
                placeholder="Choose a dataset for analysis"
                value={selectedFile}
                onChange={setSelectedFile}
              >
                {availableFiles.map((file) => (
                  <Option key={file.name} value={file.name}>
                    {file.name} ({file.size})
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={12}>
              <label style={{ display: 'block', marginBottom: 8 }}>Select Model:</label>
              <Select
                style={{ width: '100%' }}
                placeholder="Choose detection model"
                value={selectedModel}
                onChange={setSelectedModel}
              >
                <Option value="ensemble">Ensemble (Recommended)</Option>
                {availableModels.map((model) => (
                  <Option key={model} value={model}>
                    {model.replace('_', ' ').toUpperCase()}
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>

          <Button
            type="primary"
            icon={<SecurityScanOutlined />}
            onClick={handleDetect}
            loading={detecting}
            disabled={!selectedFile}
            size="large"
          >
            {detecting ? 'Analyzing...' : 'Start Threat Detection'}
          </Button>
        </Space>
      </Card>

      {error && (
        <Alert
          message="Detection Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {detectionResults && (
        <>
          <Card title="Detection Summary" style={{ marginBottom: 24 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="Total Records"
                  value={detectionResults.summary.total_records}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="Threats Detected"
                  value={detectionResults.summary.threats_detected}
                  prefix={<ExclamationCircleOutlined />}
                  valueStyle={{ color: '#f5222d' }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="Benign Records"
                  value={detectionResults.summary.benign_records}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <div style={{ textAlign: 'center' }}>
                  <div className="stats-number" style={{ color: threatLevel.color }}>
                    {detectionResults.summary.threat_percentage.toFixed(1)}%
                  </div>
                  <div className="stats-label">Threat Rate</div>
                  <Tag color={threatLevel.color} style={{ marginTop: 4 }}>
                    {threatLevel.level} RISK
                  </Tag>
                </div>
              </Col>
            </Row>
          </Card>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={12}>
              <Card title="Threat Distribution">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Detection Confidence">
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Progress
                    type="circle"
                    percent={Math.max(
                      detectionResults.summary.threat_percentage,
                      100 - detectionResults.summary.threat_percentage
                    )}
                    format={() => `${selectedModel.toUpperCase()}`}
                    strokeColor="#1890ff"
                    size={120}
                  />
                  <div style={{ marginTop: 16 }}>
                    <p>Model: <strong>{selectedModel.replace('_', ' ').toUpperCase()}</strong></p>
                    <p>Confidence: <strong>High</strong></p>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          <Card title="Detailed Detection Results">
            <Table
              columns={columns}
              dataSource={getTableData()}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} records`,
              }}
              scroll={{ x: true }}
            />
          </Card>

          {detectionResults.summary.threat_percentage > 15 && (
            <Alert
              message="High Threat Level Detected"
              description={`The analysis detected ${detectionResults.summary.threats_detected} threats out of ${detectionResults.summary.total_records} records (${detectionResults.summary.threat_percentage.toFixed(1)}%). Immediate investigation recommended.`}
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ThreatDetection;
