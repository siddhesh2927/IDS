import React, { useState, useEffect } from 'react';
import { Card, Button, Switch, Progress, Alert, Statistic, Row, Col, Table, Tag, Space, message, Input, Modal, List, Select } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, SecurityScanOutlined, BellOutlined, WarningOutlined, SettingOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { io } from 'socket.io-client';
import axios from 'axios';

const { Option } = Select;

const RealTimeMonitoring = () => {
  const [socket, setSocket] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [networkData, setNetworkData] = useState([]);
  const [alertThreshold, setAlertThreshold] = useState(0.7);
  const [showSettings, setShowSettings] = useState(false);
  const [tempThreshold, setTempThreshold] = useState(0.7);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    // Initialize WebSocket connection
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      message.success('Connected to real-time monitoring system');
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      message.error('Disconnected from monitoring system');
    });

    newSocket.on('connected', (data) => {
      console.log('Connected:', data.message);
    });

    // Real-time data events
    newSocket.on('network_data', (data) => {
      setNetworkData(prev => {
        const newData = [data, ...prev].slice(0, 100); // Keep last 100 records
        return newData;
      });
    });

    newSocket.on('security_alert', (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50)); // Keep last 50 alerts
      message.error(`🚨 Security Alert: ${alert.message}`, 5);
    });

    newSocket.on('status_update', (status) => {
      setStreamingStatus(status);
      setIsStreaming(status.is_streaming);
    });

    // Fetch initial status
    fetchStreamingStatus();
    fetchAlerts();

    return () => newSocket.close();
  }, []);

  const fetchStreamingStatus = async () => {
    try {
      const response = await axios.get('http://localhost:5000/streaming/status');
      setStreamingStatus(response.data);
      setIsStreaming(response.data.is_streaming);
    } catch (error) {
      console.error('Error fetching streaming status:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/alerts');
      setAlerts(response.data.alerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const startStreaming = async () => {
    try {
      const response = await axios.post('http://localhost:5000/streaming/start', {
        config: { interval: 1 }
      });
      message.success('Real-time monitoring started');
      setIsStreaming(true);
    } catch (error) {
      message.error('Failed to start streaming');
    }
  };

  const stopStreaming = async () => {
    try {
      const response = await axios.post('http://localhost:5000/streaming/stop');
      message.success('Real-time monitoring stopped');
      setIsStreaming(false);
    } catch (error) {
      message.error('Failed to stop streaming');
    }
  };

  const updateAlertThreshold = async () => {
    try {
      await axios.post('http://localhost:5000/alerts/threshold', {
        threshold: tempThreshold
      });
      setAlertThreshold(tempThreshold);
      setShowSettings(false);
      message.success(`Alert threshold set to ${(tempThreshold * 100).toFixed(0)}%`);
    } catch (error) {
      message.error('Failed to update alert threshold');
    }
  };

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#52c41a';
      case 'disconnected': return '#f5222d';
      default: return '#faad14';
    }
  };

  const getThreatLevelColor = (level) => {
    switch (level) {
      case 'HIGH': return '#f5222d';
      case 'MEDIUM': return '#faad14';
      case 'LOW': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  const chartData = networkData.slice(0, 50).reverse().map((item, index) => ({
    time: new Date(item.timestamp).toLocaleTimeString(),
    probability: (item.probability * 100).toFixed(1),
    threat: item.prediction === 1 ? (item.probability * 100).toFixed(1) : 0
  }));

  const columns = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => new Date(timestamp).toLocaleTimeString(),
      width: 120,
    },
    {
      title: 'Threat Level',
      dataIndex: 'threat_level',
      key: 'threat_level',
      render: (level) => (
        <Tag color={getThreatLevelColor(level)}>
          {level}
        </Tag>
      ),
      width: 100,
    },
    {
      title: 'Probability',
      dataIndex: 'probability',
      key: 'probability',
      render: (probability) => (
        <Progress
          percent={(probability * 100).toFixed(1)}
          size="small"
          strokeColor={probability > 0.7 ? '#f5222d' : probability > 0.3 ? '#faad14' : '#52c41a'}
          format={() => `${(probability * 100).toFixed(1)}%`}
        />
      ),
      width: 150,
    },
    {
      title: 'Protocol',
      dataIndex: ['data', 'protocol'],
      key: 'protocol',
      width: 80,
    },
    {
      title: 'Service',
      dataIndex: ['data', 'service'],
      key: 'service',
      width: 80,
    },
    {
      title: 'Src Bytes',
      dataIndex: ['data', 'src_bytes'],
      key: 'src_bytes',
      render: (bytes) => bytes?.toLocaleString(),
      width: 100,
    },
  ];

  const alertColumns = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp) => new Date(timestamp).toLocaleTimeString(),
      width: 120,
    },
    {
      title: 'Threat Level',
      dataIndex: 'threat_level',
      key: 'threat_level',
      render: (level) => (
        <Tag color={getThreatLevelColor(level)}>
          {level}
        </Tag>
      ),
      width: 100,
    },
    {
      title: 'Probability',
      dataIndex: 'probability',
      key: 'probability',
      render: (probability) => `${(probability * 100).toFixed(1)}%`,
      width: 100,
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
    },
  ];

  return (
    <div>
      {/* Connection Status */}
      <Card style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div 
                  style={{ 
                    width: 12, 
                    height: 12, 
                    borderRadius: '50%', 
                    backgroundColor: getConnectionColor(),
                    marginRight: 8
                  }} 
                />
                <span>Connection: {connectionStatus.toUpperCase()}</span>
              </div>
              {isStreaming && (
                <Tag color="blue" icon={<SecurityScanOutlined />}>
                  STREAMING ACTIVE
                </Tag>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                type={isStreaming ? "default" : "primary"}
                icon={isStreaming ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={isStreaming ? stopStreaming : startStreaming}
                danger={isStreaming}
              >
                {isStreaming ? 'Stop Monitoring' : 'Start Monitoring'}
              </Button>
              <Button
                icon={<SettingOutlined />}
                onClick={() => {
                  setTempThreshold(alertThreshold);
                  setShowSettings(true);
                }}
              >
                Settings
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Packets Analyzed"
              value={streamingStatus.total_alerts || 0}
              prefix={<SecurityScanOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Recent Alerts"
              value={streamingStatus.recent_alerts || 0}
              prefix={<BellOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Alert Threshold"
              value={`${(alertThreshold * 100).toFixed(0)}%`}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Live Data Points"
              value={networkData.length}
              prefix={<SecurityScanOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Real-time Chart */}
      <Card title="Real-time Threat Probability" style={{ marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Area 
              type="monotone" 
              dataKey="threat" 
              stroke="#f5222d" 
              fill="#f5222d" 
              fillOpacity={0.3}
              name="Threat Probability"
            />
            <Area 
              type="monotone" 
              dataKey="probability" 
              stroke="#1890ff" 
              fill="#1890ff" 
              fillOpacity={0.1}
              name="Overall Probability"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <Card title="Recent Security Alerts" style={{ marginBottom: 24 }}>
          <Table
            columns={alertColumns}
            dataSource={alerts.slice(0, 10)}
            pagination={false}
            size="small"
            scroll={{ x: true }}
          />
        </Card>
      )}

      {/* Live Network Data */}
      <Card title="Live Network Data">
        <Table
          columns={columns}
          dataSource={networkData.slice(0, 20)}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          scroll={{ x: true }}
          size="small"
        />
      </Card>

      {/* Settings Modal */}
      <Modal
        title="Monitoring Settings"
        visible={showSettings}
        onOk={updateAlertThreshold}
        onCancel={() => setShowSettings(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <label>Alert Threshold (%):</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={(tempThreshold * 100).toFixed(0)}
              onChange={(e) => setTempThreshold(Number(e.target.value) / 100)}
              suffix="%"
            />
            <div style={{ marginTop: 8, color: '#666' }}>
              Alerts will be triggered when threat probability exceeds this threshold
            </div>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default RealTimeMonitoring;
