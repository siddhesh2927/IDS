import React, { useState, useCallback } from 'react';
import { Card, Upload, Button, message, Table, Tag, Progress, Alert, Spin } from 'antd';
import { InboxOutlined, UploadOutlined, FileTextOutlined } from '@ant-design/icons';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const { Dragger } = Upload;

const DataUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [fileInfo, setFileInfo] = useState(null);
  const [dataInfo, setDataInfo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      handleUpload(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(progress);
        },
      });

      setFileInfo({
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        type: file.type,
      });

      setDataInfo(response.data.data_info);
      message.success('File uploaded successfully!');
    } catch (error) {
      message.error('Failed to upload file: ' + (error.response?.data?.error || error.message));
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const columns = [
    {
      title: 'Column Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Data Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const color = type === 'object' ? 'blue' : 'green';
        return <Tag color={color}>{type}</Tag>;
      },
    },
    {
      title: 'Null Values',
      dataIndex: 'nulls',
      key: 'nulls',
      render: (nulls, record) => {
        const percentage = ((nulls / record.total) * 100).toFixed(1);
        return (
          <div>
            <div>{nulls}</div>
            <small>({percentage}%)</small>
          </div>
        );
      },
    },
  ];

  const sampleColumns = [
    {
      title: 'Sample Data',
      dataIndex: 'sample',
      key: 'sample',
    },
  ];

  const getTableData = () => {
    if (!dataInfo) return [];

    return Object.keys(dataInfo.dtypes).map((key) => ({
      key,
      name: key,
      type: dataInfo.dtypes[key],
      nulls: dataInfo.null_values[key],
      total: dataInfo.shape[0],
    }));
  };

  const getSampleData = () => {
    if (!dataInfo || !dataInfo.sample_data) return [];

    return dataInfo.sample_data.map((row, index) => ({
      key: index,
      sample: JSON.stringify(row, null, 2),
    }));
  };

  return (
    <div>
      <Card title="Upload Network Dataset" style={{ marginBottom: 24 }}>
        <div
          {...getRootProps()}
          className={`upload-area ${isDragActive ? 'active' : ''}`}
        >
          <input {...getInputProps()} />
          <InboxOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          {isDragActive ? (
            <p>Drop the CSV file here ...</p>
          ) : (
            <div>
              <p>Click or drag CSV file to this area to upload</p>
              <p style={{ color: '#999', fontSize: 12 }}>
                Support for CSV files up to 16MB
              </p>
            </div>
          )}
        </div>

        {uploading && (
          <div style={{ marginTop: 16 }}>
            <Progress percent={uploadProgress} status="active" />
            <p style={{ textAlign: 'center', marginTop: 8 }}>
              Uploading and analyzing file...
            </p>
          </div>
        )}

        {fileInfo && (
          <Alert
            message="File Uploaded Successfully"
            description={
              <div>
                <p><strong>Filename:</strong> {fileInfo.name}</p>
                <p><strong>Size:</strong> {fileInfo.size}</p>
                <p><strong>Type:</strong> {fileInfo.type}</p>
              </div>
            }
            type="success"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {dataInfo && (
        <>
          <Card title="Dataset Overview" style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div className="stats-card">
                <div className="stats-number">{dataInfo.shape[0].toLocaleString()}</div>
                <div className="stats-label">Total Records</div>
              </div>
              <div className="stats-card">
                <div className="stats-number">{dataInfo.shape[1]}</div>
                <div className="stats-label">Total Columns</div>
              </div>
              <div className="stats-card">
                <div className="stats-number">{dataInfo.numeric_columns.length}</div>
                <div className="stats-label">Numeric Columns</div>
              </div>
              <div className="stats-card">
                <div className="stats-number">{dataInfo.categorical_columns.length}</div>
                <div className="stats-label">Categorical Columns</div>
              </div>
            </div>

            {dataInfo.suggested_target && (
              <Alert
                message="Target Column Detected"
                description={`The system has identified "${dataInfo.suggested_target}" as the target column for training.`}
                type="info"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </Card>

          <Card title="Column Information" style={{ marginBottom: 24 }}>
            <Table
              columns={columns}
              dataSource={getTableData()}
              pagination={false}
              size="small"
            />
          </Card>

          <Card title="Sample Data (First 5 Rows)">
            <Table
              columns={sampleColumns}
              dataSource={getSampleData()}
              pagination={false}
              expandable={{
                expandedRowRender: (record) => (
                  <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
                    {record.sample}
                  </pre>
                ),
              }}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default DataUpload;
