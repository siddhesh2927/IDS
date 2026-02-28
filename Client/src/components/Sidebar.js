import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
  DashboardOutlined,
  UploadOutlined,
  RobotOutlined,
  SecurityScanOutlined,
  HistoryOutlined,
  SettingOutlined,
  SafetyOutlined,
  PlayCircleOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider } = Layout;

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/datasets',
      icon: <DatabaseOutlined />,
      label: 'Datasets',
    },
    {
      key: '/upload',
      icon: <UploadOutlined />,
      label: 'Data Upload',
    },
    {
      key: '/training',
      icon: <RobotOutlined />,
      label: 'Model Training',
    },
    {
      key: '/detection',
      icon: <SecurityScanOutlined />,
      label: 'Threat Detection',
    },
    {
      key: '/realtime',
      icon: <PlayCircleOutlined />,
      label: 'Real-time Monitor',
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: 'Detection History',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={(value) => setCollapsed(value)}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
      }}
    >
      <div className="logo">
        <SafetyOutlined style={{ marginRight: collapsed ? 0 : 8 }} />
        {!collapsed && 'IDS'}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </Sider>
  );
};

export default Sidebar;
