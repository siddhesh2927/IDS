import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Progress, Alert, Spin } from 'antd';
import { 
  SecurityScanOutlined, 
  DatabaseOutlined, 
  RobotOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined 
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, historyResponse] = await Promise.all([
        axios.get('http://localhost:5000/stats'),
        axios.get('http://localhost:5000/history')
      ]);

      setStats(statsResponse.data.stats);
      setHistory(historyResponse.data.history);
      setError(null);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getThreatLevel = (percentage) => {
    if (percentage > 20) return { level: 'High', color: '#f5222d' };
    if (percentage > 10) return { level: 'Medium', color: '#faad14' };
    return { level: 'Low', color: '#52c41a' };
  };

  const pieData = stats ? [
    { name: 'Threats', value: stats.total_threats_detected, color: '#f5222d' },
    { name: 'Benign', value: stats.total_records_analyzed - stats.total_threats_detected, color: '#52c41a' }
  ] : [];

  if (loading) {
    return (
      <div className="loading-spinner">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
        style={{ margin: 20 }}
      />
    );
  }

  const threatLevel = getThreatLevel(stats.overall_threat_rate);

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Records Analyzed"
              value={stats.total_records_analyzed}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Threats Detected"
              value={stats.total_threats_detected}
              prefix={<SecurityScanOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Models Trained"
              value={stats.models_trained}
              prefix={<RobotOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Recent Activity (24h)"
              value={stats.recent_activity_24h}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Threat Detection Rate" className="chart-container">
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Progress
                type="circle"
                percent={stats.overall_threat_rate}
                format={(percent) => `${percent?.toFixed(1)}%`}
                strokeColor={threatLevel.color}
                size={120}
              />
              <div style={{ marginTop: 8 }}>
                <span className={`threat-indicator ${threatLevel.level.toLowerCase()}`}>
                  {threatLevel.level} Risk
                </span>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Threat Distribution" className="chart-container">
            <ResponsiveContainer width="100%" height={200}>
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
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="Recent Detection History" className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={history.slice(0, 10).reverse()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={(entry) => new Date(entry.created_at).toLocaleDateString()} />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => `Date: ${value}`}
                  formatter={(value, name) => [
                    value, 
                    name === 'threat_count' ? 'Threats Detected' : 'Total Records'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="threat_count" 
                  stroke="#f5222d" 
                  strokeWidth={2}
                  name="threat_count"
                />
                <Line 
                  type="monotone" 
                  dataKey="total_records" 
                  stroke="#1890ff" 
                  strokeWidth={2}
                  name="total_records"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {stats.overall_threat_rate > 15 && (
        <Alert
          message="High Threat Level Detected"
          description={`The current threat detection rate is ${stats.overall_threat_rate.toFixed(1)}%, which exceeds the normal threshold. Consider reviewing recent detection results and updating your security policies.`}
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
          icon={<ExclamationCircleOutlined />}
        />
      )}
    </div>
  );
};

export default Dashboard;
