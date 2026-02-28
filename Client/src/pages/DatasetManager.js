import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Table, Tag, Space, message, Modal, Descriptions, Progress, Row, Col, Statistic, Select } from 'antd';
import { CloudDownloadOutlined, SearchOutlined, EyeOutlined, DatabaseOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

const DatasetManager = () => {
  const [kaggleAuth, setKaggleAuth] = useState({ username: '', key: '' });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [popularDatasets, setPopularDatasets] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [analysisModal, setAnalysisModal] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [authModal, setAuthModal] = useState(false);

  useEffect(() => {
    fetchPopularDatasets();
  }, []);

  const fetchPopularDatasets = async () => {
    try {
      const response = await axios.get('http://localhost:5000/kaggle/datasets/popular');
      setPopularDatasets(response.data.datasets);
    } catch (error) {
      console.error('Error fetching popular datasets:', error);
    }
  };

  const authenticateKaggle = async () => {
    try {
      const response = await axios.post('http://localhost:5000/kaggle/authenticate', kaggleAuth);
      setIsAuthenticated(true);
      setAuthModal(false);
      message.success('Successfully authenticated with Kaggle');
    } catch (error) {
      message.error('Authentication failed: ' + (error.response?.data?.error || error.message));
    }
  };

  const searchDatasets = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const response = await axios.post('http://localhost:5000/kaggle/datasets/search', {
        query: searchQuery,
        max_results: 20
      });
      setSearchResults(response.data.datasets);
    } catch (error) {
      message.error('Search failed: ' + (error.response?.data?.error || error.message));
    }
  };

  const downloadDataset = async (datasetRef) => {
    setDownloading(true);
    try {
      const response = await axios.post('http://localhost:5000/kaggle/datasets/download', {
        dataset_ref: datasetRef
      });
      
      message.success(`Dataset downloaded successfully! Found ${response.data.analyses.length} CSV files`);
      
      // Show analysis of first file
      if (response.data.analyses.length > 0) {
        setSelectedAnalysis(response.data.analyses[0]);
        setAnalysisModal(true);
      }
      
      // Refresh popular datasets to show downloaded status
      fetchPopularDatasets();
      
    } catch (error) {
      message.error('Download failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setDownloading(false);
    }
  };

  const prepareDataset = async (csvFile, targetColumn) => {
    try {
      const response = await axios.post('http://localhost:5000/datasets/prepare', {
        csv_file: csvFile,
        target_column: targetColumn
      });
      
      message.success('Dataset prepared for training!');
      
    } catch (error) {
      message.error('Preparation failed: ' + (error.response?.data?.error || error.message));
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const datasetColumns = [
    {
      title: 'Dataset',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{title}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.ref}</div>
        </div>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      render: (size) => (
        <Tag color="blue">{typeof size === 'string' ? size : formatFileSize(size)}</Tag>
      ),
    },
    {
      title: 'Features',
      dataIndex: 'features',
      key: 'features',
      render: (features) => (
        <div>
          {features?.slice(0, 3).map(feature => (
            <Tag key={feature} size="small">{feature}</Tag>
          ))}
          {features?.length > 3 && <Tag size="small">+{features.length - 3} more</Tag>}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<CloudDownloadOutlined />}
            onClick={() => downloadDataset(record.ref)}
            loading={downloading}
            disabled={!isAuthenticated}
            size="small"
          >
            Download
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Authentication */}
      <Card title="Kaggle Authentication" style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <DatabaseOutlined />
              <span>
                Status: <Tag color={isAuthenticated ? 'green' : 'red'}>
                  {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                </Tag>
              </span>
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              onClick={() => setAuthModal(true)}
              disabled={isAuthenticated}
            >
              {isAuthenticated ? 'Authenticated' : 'Authenticate with Kaggle'}
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Search */}
      <Card title="Search Datasets" style={{ marginBottom: 24 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="Search for intrusion detection datasets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onPressEnter={searchDatasets}
            disabled={!isAuthenticated}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={searchDatasets}
            disabled={!isAuthenticated}
          >
            Search
          </Button>
        </Space.Compact>
      </Card>

      {/* Popular Datasets */}
      <Card title="Popular Intrusion Detection Datasets" style={{ marginBottom: 24 }}>
        <Table
          columns={datasetColumns}
          dataSource={popularDatasets}
          pagination={false}
          rowKey="ref"
        />
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card title="Search Results" style={{ marginBottom: 24 }}>
          <Table
            columns={datasetColumns}
            dataSource={searchResults}
            pagination={{ pageSize: 10 }}
            rowKey="ref"
          />
        </Card>
      )}

      {/* Authentication Modal */}
      <Modal
        title="Kaggle Authentication"
        visible={authModal}
        onOk={authenticateKaggle}
        onCancel={() => setAuthModal(false)}
        okText="Authenticate"
      >
        <Form layout="vertical">
          <Form.Item label="Kaggle Username" required>
            <Input
              placeholder="Your Kaggle username"
              value={kaggleAuth.username}
              onChange={(e) => setKaggleAuth({ ...kaggleAuth, username: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="Kaggle API Key" required>
            <Input.Password
              placeholder="Your Kaggle API key"
              value={kaggleAuth.key}
              onChange={(e) => setKaggleAuth({ ...kaggleAuth, key: e.target.value })}
            />
            <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
              Get your API key from Kaggle Account → API → Create New API Token
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Analysis Modal */}
      <Modal
        title="Dataset Analysis"
        visible={analysisModal}
        onCancel={() => setAnalysisModal(false)}
        footer={[
          <Button key="close" onClick={() => setAnalysisModal(false)}>
            Close
          </Button>,
          <Button
            key="prepare"
            type="primary"
            onClick={() => {
              if (selectedAnalysis?.suggested_target) {
                prepareDataset(selectedAnalysis.file_path, selectedAnalysis.suggested_target);
              }
              setAnalysisModal(false);
            }}
          >
            Prepare for Training
          </Button>
        ]}
        width={800}
      >
        {selectedAnalysis && (
          <div>
            <Descriptions title="Dataset Information" bordered size="small">
              <Descriptions.Item label="File Name">{selectedAnalysis.file_name}</Descriptions.Item>
              <Descriptions.Item label="Sample Shape">{selectedAnalysis.shape_sample?.join(' × ')}</Descriptions.Item>
              <Descriptions.Item label="Total Columns">{selectedAnalysis.columns?.length}</Descriptions.Item>
              <Descriptions.Item label="Numeric Columns">{selectedAnalysis.numeric_columns?.length}</Descriptions.Item>
              <Descriptions.Item label="Categorical Columns">{selectedAnalysis.categorical_columns?.length}</Descriptions.Item>
              <Descriptions.Item label="Suggested Target">
                <Tag color="green">{selectedAnalysis.suggested_target || 'None detected'}</Tag>
              </Descriptions.Item>
            </Descriptions>

            {selectedAnalysis.suggested_target && selectedAnalysis.target_values && (
              <div style={{ marginTop: 24 }}>
                <h4>Target Variable Distribution</h4>
                <Row gutter={16}>
                  {Object.entries(selectedAnalysis.target_values).map(([key, value]) => (
                    <Col span={8} key={key}>
                      <Card size="small">
                        <Statistic
                          title={key}
                          value={value}
                          valueStyle={{ color: key.toLowerCase().includes('attack') || key.toLowerCase().includes('threat') ? '#f5222d' : '#52c41a' }}
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <h4>Column Preview</h4>
              <Table
                columns={selectedAnalysis.columns.map(col => ({
                  title: col,
                  dataIndex: col,
                  key: col,
                  ellipsis: true,
                }))}
                dataSource={selectedAnalysis.sample_data}
                pagination={false}
                size="small"
                scroll={{ x: true }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DatasetManager;
