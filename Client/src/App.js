import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import DataUpload from './pages/DataUpload';
import ModelTraining from './pages/ModelTraining';
import ThreatDetection from './pages/ThreatDetection';
import History from './pages/History';
import Settings from './pages/Settings';
import RealTimeMonitoring from './pages/RealTimeMonitoring';
import DatasetManager from './pages/DatasetManager';

const { Content } = Layout;

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout className="site-layout">
        <Content className="ant-layout-content">
          <div className="site-layout-background">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<DataUpload />} />
              <Route path="/training" element={<ModelTraining />} />
              <Route path="/detection" element={<ThreatDetection />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/realtime" element={<RealTimeMonitoring />} />
              <Route path="/datasets" element={<DatasetManager />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
