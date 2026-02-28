import React, { useState, useEffect } from 'react';
import { Card, Button, Select, Table, Progress, Alert, Spin, Tag, Space, message } from 'antd';
import { RobotOutlined, PlayCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import axios from 'axios';

const { Option } = Select;

const ModelTraining = () => {
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [training, setTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingResults, setTrainingResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // In a real app, you'd fetch available files from the server
    // For now, we'll use a placeholder
    setAvailableFiles([
      { name: 'network_traffic.csv', size: '2.5 MB', uploaded: '2024-01-15' },
      { name: 'intrusion_data.csv', size: '1.8 MB', uploaded: '2024-01-14' },
    ]);
  }, []);

  const handleTrain = async () => {
    if (!selectedFile) {
      message.error('Please select a file first');
      return;
    }

    setTraining(true);
    setTrainingProgress(0);
    setError(null);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    try {
      const response = await axios.post('http://localhost:5000/train', {
        filename: selectedFile
      });

      setTrainingResults(response.data.results);
      setTrainingProgress(100);
      message.success('Models trained successfully!');
    } catch (err) {
      setError('Training failed: ' + (err.response?.data?.error || err.message));
      message.error('Training failed');
    } finally {
      clearInterval(progressInterval);
      setTraining(false);
    }
  };

  const getPerformanceColor = (score) => {
    if (score >= 0.9) return '#52c41a';
    if (score >= 0.7) return '#faad14';
    return '#f5222d';
  };

  const getPerformanceLevel = (score) => {
    if (score >= 0.9) return 'Excellent';
    if (score >= 0.7) return 'Good';
    return 'Poor';
  };

  const columns = [
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Accuracy',
      dataIndex: 'accuracy',
      key: 'accuracy',
      render: (value) => (
        <div>
          <Progress
            percent={(value * 100).toFixed(1)}
            size="small"
            strokeColor={getPerformanceColor(value)}
            format={() => `${(value * 100).toFixed(1)}%`}
          />
          <Tag color={getPerformanceColor(value)} style={{ marginTop: 4 }}>
            {getPerformanceLevel(value)}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Precision',
      dataIndex: 'precision',
      key: 'precision',
      render: (value) => `${(value * 100).toFixed(1)}%`,
    },
    {
      title: 'Recall',
      dataIndex: 'recall',
      key: 'recall',
      render: (value) => `${(value * 100).toFixed(1)}%`,
    },
    {
      title: 'F1 Score',
      dataIndex: 'f1_score',
      key: 'f1_score',
      render: (value) => `${(value * 100).toFixed(1)}%`,
    },
  ];

  const getTableData = () => {
    if (!trainingResults) return [];

    return Object.entries(trainingResults)
      .filter(([_, result]) => !result.error)
      .map(([model, result]) => ({
        key: model,
        model: model.replace('_', ' ').toUpperCase(),
        accuracy: result.metrics.accuracy,
        precision: result.metrics.precision,
        recall: result.metrics.recall,
        f1_score: result.metrics.f1_score,
      }));
  };

  const getChartData = () => {
    if (!trainingResults) return [];

    return Object.entries(trainingResults)
      .filter(([_, result]) => !result.error)
      .map(([model, result]) => ({
        model: model.replace('_', ' ').toUpperCase(),
        accuracy: (result.metrics.accuracy * 100).toFixed(1),
        precision: (result.metrics.precision * 100).toFixed(1),
        recall: (result.metrics.recall * 100).toFixed(1),
        f1_score: (result.metrics.f1_score * 100).toFixed(1),
      }));
  };

  const getRadarData = () => {
    if (!trainingResults) return [];

    const metrics = ['accuracy', 'precision', 'recall', 'f1_score'];
    return metrics.map(metric => ({
      metric: metric.toUpperCase(),
      ...Object.entries(trainingResults)
        .filter(([_, result]) => !result.error)
        .reduce((acc, [model, result]) => {
          acc[model.replace('_', ' ').toUpperCase()] = (result.metrics[metric] * 100).toFixed(1);
          return acc;
        }, {}),
    }));
  };

  const getBestModel = () => {
    if (!trainingResults) return null;

    let bestModel = null;
    let bestScore = 0;

    Object.entries(trainingResults).forEach(([model, result]) => {
      if (!result.error && result.metrics.f1_score > bestScore) {
        bestScore = result.metrics.f1_score;
        bestModel = model;
      }
    });

    return bestModel;
  };

  return (
    <div>
      <Card title="Model Training Configuration" style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8 }}>Select Dataset:</label>
            <Select
              style={{ width: '100%' }}
              placeholder="Choose a dataset to train models"
              value={selectedFile}
              onChange={setSelectedFile}
            >
              {availableFiles.map((file) => (
                <Option key={file.name} value={file.name}>
                  {file.name} ({file.size})
                </Option>
              ))}
            </Select>
          </div>

          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleTrain}
            loading={training}
            disabled={!selectedFile}
            size="large"
          >
            {training ? 'Training Models...' : 'Start Training'}
          </Button>

          {training && (
            <div>
              <Progress percent={trainingProgress} status="active" />
              <p style={{ textAlign: 'center', marginTop: 8 }}>
                Training machine learning models... This may take several minutes.
              </p>
            </div>
          )}
        </Space>
      </Card>

      {error && (
        <Alert
          message="Training Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {trainingResults && (
        <>
          {getBestModel() && (
            <Alert
              message="Training Completed Successfully"
              description={`Best performing model: ${getBestModel().replace('_', ' ').toUpperCase()}`}
              type="success"
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}

          <Card title="Model Performance Comparison" style={{ marginBottom: 24 }}>
            <Table
              columns={columns}
              dataSource={getTableData()}
              pagination={false}
              size="middle"
            />
          </Card>

          <Card title="Performance Visualization" style={{ marginBottom: 24 }}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="accuracy" fill="#1890ff" />
                <Bar dataKey="precision" fill="#52c41a" />
                <Bar dataKey="recall" fill="#faad14" />
                <Bar dataKey="f1_score" fill="#f5222d" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Model Performance Radar">
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={getRadarData()}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                {Object.keys(trainingResults)
                  .filter(model => !trainingResults[model].error)
                  .slice(0, 5) // Limit to 5 models for readability
                  .map((model, index) => (
                    <Radar
                      key={model}
                      name={model.replace('_', ' ').toUpperCase()}
                      dataKey={model.replace('_', ' ').toUpperCase()}
                      stroke={['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'][index]}
                      fill={['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'][index]}
                      fillOpacity={0.1}
                    />
                  ))}
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
};

export default ModelTraining;
