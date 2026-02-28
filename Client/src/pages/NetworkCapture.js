import React, { useState, useEffect } from 'react';
import { Card, Button, Select, Switch, Input, Progress, Alert, Statistic, Row, Col, Table, Tag, Space, message, Modal, List, Tabs, Form } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, SecurityScanOutlined, BellOutlined, WarningOutlined, SettingOutlined, GlobalOutlined, DatabaseOutlined, FilterOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { io } from 'socket.io-client';
import axios from 'axios';

const { Option } = Select;
const { TabPane } = Tabs;

const NetworkCapture = () => {
  const [socket, setSocket] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState({});
  const [networkData, setNetworkData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [interfaces, setInterfaces] = useState([]);
  const [captureConfig, setCaptureConfig] = useState({
    mode: 'simulated',
    interface: '',
    privacy_mode: true,
    alert_threshold: 0.7,
    filters: {
      protocols: ['TCP', 'UDP', 'ICMP'],
      ports: [],
      min_packet_size: 0
    }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [activeTab, setActiveTab] = useState('capture');

  useEffect(() => {
    // Initialize WebSocket connection
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      message.success('Connected to network capture system');
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      message.error('Disconnected from capture system');
    });

    newSocket.on('connected', (data) => {
      console.log('Connected:', data.message);
    });

    // Real-time data events
    newSocket.on('network_data', (data) => {
      console.log('Received network data:', data);
      setNetworkData(prev => {
        const newData = [data, ...prev].slice(0, 100);
        return newData;
      });
    });

    newSocket.on('security_alert', (alert) => {
      console.log('Received security alert:', alert);
      setAlerts(prev => [alert, ...prev].slice(0, 50));
      message.error(`🚨 Security Alert: ${alert.message}`, 5);
    });

    // Fetch initial data
    fetchNetworkInterfaces();
    fetchCaptureStatus();
    fetchAlerts();

    return () => newSocket.close();
  }, []);

  const fetchNetworkInterfaces = async () => {
    try {
      const response = await axios.get('http://localhost:5000/network/interfaces');
      setInterfaces(response.data.interfaces);
    } catch (error) {
      console.error('Error fetching interfaces:', error);
    }
  };

  const fetchCaptureStatus = async () => {
    try {
      const response = await axios.get('http://localhost:5000/network/capture/status');
      setCaptureStatus(response.data);
      setIsCapturing(response.data.is_capturing);
    } catch (error) {
      console.error('Error fetching capture status:', error);
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

  const startCapture = async () => {
    try {
      console.log('Starting network capture with config:', captureConfig);
      const response = await axios.post('http://localhost:5000/network/capture/start', {
        config: captureConfig
      });
      console.log('Capture started response:', response.data);
      message.success('Network capture started');
      setIsCapturing(true);
    } catch (error) {
      console.error('Failed to start capture:', error);
      message.error('Failed to start capture: ' + (error.response?.data?.error || error.message));
    }
  };

  const stopCapture = async () => {
    try {
      console.log('Stopping network capture...');
      const response = await axios.post('http://localhost:5000/network/capture/stop');
      console.log('Capture stopped response:', response.data);
      message.success('Network capture stopped');
      setIsCapturing(false);
    } catch (error) {
      console.error('Failed to stop capture:', error);
      message.error('Failed to stop capture');
    }
  };

  const updateCaptureConfig = (key, value) => {
    setCaptureConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateFilterConfig = (key, value) => {
    setCaptureConfig(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [key]: value
      }
    }));
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

  const getCaptureModeIcon = (mode) => {
    switch (mode) {
      case 'real': return <GlobalOutlined />;
      case 'simulated': return <DatabaseOutlined />;
      case 'hybrid': return <SecurityScanOutlined />;
      case 'logs': return <DatabaseOutlined />;
      default: return <SecurityScanOutlined />;
    }
  };

  const chartData = networkData.slice(0, 50).reverse().map((item, index) => ({
    time: new Date(item.timestamp).toLocaleTimeString(),
    probability: (item.probability * 100).toFixed(1),
    threat: item.prediction === 1 ? (item.probability * 100).toFixed(1) : 0,
    source: item.source
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
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (source) => (
        <Tag color={source === 'real_capture' ? 'green' : source === 'simulated' ? 'blue' : 'orange'}>
          {source.replace('_', ' ')}
        </Tag>
      ),
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
      dataIndex: ['data', 'transport_protocol'],
      key: 'protocol',
      width: 80,
    },
    {
      title: 'Src IP',
      dataIndex: ['data', 'src_ip'],
      key: 'src_ip',
      render: (ip) => (
        <code style={{ fontSize: '11px' }}>{ip}</code>
      ),
      width: 120,
    },
    {
      title: 'Dst IP',
      dataIndex: ['data', 'dst_ip'],
      key: 'dst_ip',
      render: (ip) => (
        <code style={{ fontSize: '11px' }}>{ip}</code>
      ),
      width: 120,
    },
    {
      title: 'Size',
      dataIndex: ['data', 'packet_size'],
      key: 'packet_size',
      render: (size) => size?.toLocaleString(),
      width: 80,
    },
  ];

  const interfaceColumns = [
    {
      title: 'Interface',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{name}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.description}</div>
        </div>
      ),
    },
    {
      title: 'IP Address',
      dataIndex: 'ip',
      key: 'ip',
      render: (ip) => ip ? <code>{ip}</code> : 'N/A',
    },
    {
      title: 'MAC Address',
      dataIndex: 'mac',
      key: 'mac',
      render: (mac) => mac ? <code style={{ fontSize: '11px' }}>{mac}</code> : 'N/A',
    },
    {
      title: 'Status',
      dataIndex: 'is_up',
      key: 'is_up',
      render: (is_up) => (
        <Tag color={is_up ? 'green' : 'red'}>
          {is_up ? 'UP' : 'DOWN'}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          size="small"
          type={captureConfig.interface === record.name ? 'primary' : 'default'}
          onClick={() => updateCaptureConfig('interface', record.name)}
        >
          {captureConfig.interface === record.name ? 'Selected' : 'Select'}
        </Button>
      ),
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
              {isCapturing && (
                <Tag color="blue" icon={getCaptureModeIcon(captureConfig.mode)}>
                  {captureConfig.mode.toUpperCase()} CAPTURE ACTIVE
                </Tag>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                type={isCapturing ? "default" : "primary"}
                icon={isCapturing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={isCapturing ? stopCapture : startCapture}
                danger={isCapturing}
                disabled={captureConfig.mode === 'real' && !captureConfig.interface}
              >
                {isCapturing ? 'Stop Capture' : 'Start Capture'}
              </Button>
              <Button
                icon={<SettingOutlined />}
                onClick={() => setShowSettings(true)}
              >
                Settings
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Network Capture" key="capture">
          {/* Statistics */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Packets Captured"
                  value={captureStatus.total_packets || 0}
                  prefix={<SecurityScanOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Capture Mode"
                  value={captureConfig.mode.toUpperCase()}
                  prefix={getCaptureModeIcon(captureConfig.mode)}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Alert Threshold"
                  value={`${(captureConfig.alert_threshold * 100).toFixed(0)}%`}
                  prefix={<WarningOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Privacy Mode"
                  value={captureConfig.privacy_mode ? 'ON' : 'OFF'}
                  prefix={<SecurityScanOutlined />}
                  valueStyle={{ color: captureConfig.privacy_mode ? '#52c41a' : '#f5222d' }}
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

          {/* Live Network Data */}
          <Card title="Live Network Packets">
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
        </TabPane>

        <TabPane tab="Network Interfaces" key="interfaces">
          <Card title="Available Network Interfaces">
            <Table
              columns={interfaceColumns}
              dataSource={interfaces}
              pagination={false}
              rowKey="name"
              size="small"
            />
          </Card>
        </TabPane>

        <TabPane tab="Alerts" key="alerts">
          <Card title="Security Alerts">
            <List
              dataSource={alerts.slice(0, 20)}
              renderItem={(alert) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<BellOutlined style={{ color: getThreatLevelColor(alert.threat_level) }} />}
                    title={
                      <Space>
                        <Tag color={getThreatLevelColor(alert.threat_level)}>
                          {alert.threat_level}
                        </Tag>
                        <span>{alert.source.replace('_', ' ').toUpperCase()}</span>
                      </Space>
                    }
                    description={
                      <div>
                        <div>{alert.message}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                          {new Date(alert.timestamp).toLocaleString()}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* Settings Modal */}
      <Modal
        title="Network Capture Settings"
        visible={showSettings}
        onOk={() => setShowSettings(false)}
        onCancel={() => setShowSettings(false)}
        width={800}
      >
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Capture Mode">
                <Select
                  value={captureConfig.mode}
                  onChange={(value) => updateCaptureConfig('mode', value)}
                >
                  <Option value="simulated">Simulated Data</Option>
                  <Option value="real">Real Network Capture</Option>
                  <Option value="hybrid">Hybrid (Real + Simulated)</Option>
                  <Option value="logs">Log File Analysis</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Network Interface">
                <Select
                  value={captureConfig.interface}
                  onChange={(value) => updateCaptureConfig('interface', value)}
                  disabled={captureConfig.mode !== 'real'}
                  placeholder="Select interface for real capture"
                >
                  {interfaces.map(iface => (
                    <Option key={iface.name} value={iface.name}>
                      {iface.name} ({iface.ip || 'No IP'})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Alert Threshold">
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={captureConfig.alert_threshold}
                  onChange={(e) => updateCaptureConfig('alert_threshold', parseFloat(e.target.value))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Privacy Mode (Anonymize IPs)">
                <Switch
                  checked={captureConfig.privacy_mode}
                  onChange={(checked) => updateCaptureConfig('privacy_mode', checked)}
                />
                <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                  Hide real IP addresses for privacy
                </div>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Protocol Filters">
            <Select
              mode="multiple"
              value={captureConfig.filters.protocols}
              onChange={(value) => updateFilterConfig('protocols', value)}
              placeholder="Select protocols to capture"
            >
              <Option value="TCP">TCP</Option>
              <Option value="UDP">UDP</Option>
              <Option value="ICMP">ICMP</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Port Filters">
            <Select
              mode="tags"
              value={captureConfig.filters.ports}
              onChange={(value) => updateFilterConfig('ports', value.map(Number))}
              placeholder="Enter port numbers (leave empty for all ports)"
            />
          </Form.Item>

          <Form.Item label="Minimum Packet Size">
            <Input
              type="number"
              min="0"
              value={captureConfig.filters.min_packet_size}
              onChange={(e) => updateFilterConfig('min_packet_size', parseInt(e.target.value) || 0)}
              placeholder="Minimum packet size in bytes"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NetworkCapture;
