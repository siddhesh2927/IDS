import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, DatePicker, Button, Space, Statistic, Row, Col, Alert, Progress } from 'antd';
import { HistoryOutlined, DownloadOutlined, ReloadOutlined, SecurityScanOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import axios from 'axios';
import moment from 'moment';

const { RangePicker } = DatePicker;

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchHistory();
    fetchStats();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/history');
      setHistory(response.data.history);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('http://localhost:5000/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDateFilter = (dates) => {
    setDateRange(dates);
    if (dates && dates.length === 2) {
      const filtered = history.filter(item => {
        const itemDate = moment(item.created_at);
        return itemDate.isBetween(dates[0], dates[1], 'day', '[]');
      });
      setHistory(filtered);
    } else {
      fetchHistory();
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Filename', 'Model Type', 'Threat Count', 'Total Records', 'Threat %', 'Date'],
      ...history.map(item => [
        item.filename,
        item.model_type,
        item.threat_count,
        item.total_records,
        item.threat_percentage.toFixed(2) + '%',
        moment(item.created_at).format('YYYY-MM-DD HH:mm:ss')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detection_history_${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getThreatLevel = (percentage) => {
    if (percentage > 20) return { level: 'High', color: '#f5222d' };
    if (percentage > 10) return { level: 'Medium', color: '#faad14' };
    return { level: 'Low', color: '#52c41a' };
  };

  const columns = [
    {
      title: 'Date & Time',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => moment(date).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => moment(a.created_at).unix() - moment(b.created_at).unix(),
    },
    {
      title: 'Filename',
      dataIndex: 'filename',
      key: 'filename',
      render: (filename) => <strong>{filename}</strong>,
    },
    {
      title: 'Model',
      dataIndex: 'model_type',
      key: 'model_type',
      render: (model) => (
        <Tag color="blue">{model.replace('_', ' ').toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Records Analyzed',
      dataIndex: 'total_records',
      key: 'total_records',
      render: (count) => count.toLocaleString(),
      sorter: (a, b) => a.total_records - b.total_records,
    },
    {
      title: 'Threats Detected',
      dataIndex: 'threat_count',
      key: 'threat_count',
      render: (count) => (
        <Tag color={count > 0 ? 'red' : 'green'}>
          {count.toLocaleString()}
        </Tag>
      ),
      sorter: (a, b) => a.threat_count - b.threat_count,
    },
    {
      title: 'Threat Rate',
      dataIndex: 'threat_percentage',
      key: 'threat_percentage',
      render: (percentage) => {
        const level = getThreatLevel(percentage);
        return (
          <div>
            <Progress
              percent={percentage.toFixed(1)}
              size="small"
              strokeColor={level.color}
              format={() => `${percentage.toFixed(1)}%`}
            />
            <Tag color={level.color} style={{ marginTop: 4 }}>
              {level.level}
            </Tag>
          </div>
        );
      },
      sorter: (a, b) => a.threat_percentage - b.threat_percentage,
    },
  ];

  const getChartData = () => {
    return history.slice(0, 20).reverse().map(item => ({
      date: moment(item.created_at).format('MM-DD'),
      threats: item.threat_count,
      total: item.total_records,
      threatRate: item.threat_percentage.toFixed(1),
    }));
  };

  const getBarChartData = () => {
    const dailyData = {};
    history.forEach(item => {
      const date = moment(item.created_at).format('YYYY-MM-DD');
      if (!dailyData[date]) {
        dailyData[date] = { date, threats: 0, total: 0 };
      }
      dailyData[date].threats += item.threat_count;
      dailyData[date].total += item.total_records;
    });

    return Object.values(dailyData)
      .slice(-14) // Last 14 days
      .map(item => ({
        ...item,
        threatRate: ((item.threats / item.total) * 100).toFixed(1),
      }));
  };

  return (
    <div>
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Analyses"
                value={stats.total_predictions}
                prefix={<HistoryOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Threats"
                value={stats.total_threats_detected}
                prefix={<SecurityScanOutlined />}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Records Processed"
                value={stats.total_records_analyzed}
                prefix={<DownloadOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Avg Threat Rate"
                value={stats.overall_threat_rate}
                precision={2}
                suffix="%"
                valueStyle={{ 
                  color: stats.overall_threat_rate > 15 ? '#f5222d' : '#52c41a' 
                }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card title="Detection History" style={{ marginBottom: 24 }}>
        <Space style={{ marginBottom: 16 }}>
          <RangePicker
            onChange={handleDateFilter}
            style={{ width: 300 }}
          />
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchHistory}
            loading={loading}
          >
            Refresh
          </Button>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={handleExport}
            disabled={history.length === 0}
          >
            Export CSV
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={history}
          loading={loading}
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

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Threat Detection Trend (Last 20 Analyses)">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="threats" 
                  stroke="#f5222d" 
                  strokeWidth={2}
                  name="Threats Detected"
                />
                <Line 
                  type="monotone" 
                  dataKey="threatRate" 
                  stroke="#faad14" 
                  strokeWidth={2}
                  name="Threat Rate (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Daily Threat Analysis (Last 14 Days)">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getBarChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="threats" fill="#f5222d" name="Threats" />
                <Bar dataKey="total" fill="#1890ff" name="Total Records" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {history.length > 0 && history.some(item => item.threat_percentage > 20) && (
        <Alert
          message="High Threat Activity Detected"
          description="Some recent analyses show high threat rates. Consider reviewing your security policies and updating your detection models."
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};

export default History;
