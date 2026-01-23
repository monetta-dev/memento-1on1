'use client';

import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar } from 'antd';
import {
  UserOutlined,
  VideoCameraOutlined,
  TeamOutlined,
  SettingOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';

const { Header, Sider, Content } = Layout;

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Determine selected key based on path
  const getSelectedKey = () => {
    if (pathname.startsWith('/session')) return 'session'; // Though usually hidden or different layout
    if (pathname.startsWith('/crm')) return 'crm';
    if (pathname.startsWith('/settings')) return 'settings';
    return 'dashboard';
  };

  const items = [
    {
      key: 'dashboard',
      icon: <VideoCameraOutlined />,
      label: 'Dashboard (1on1)',
      onClick: () => router.push('/'),
    },
    {
      key: 'crm',
      icon: <TeamOutlined />,
      label: '部下管理 (CRM)',
      onClick: () => router.push('/crm'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '設定 (Integrations)',
      onClick: () => router.push('/settings'),
    },
  ];

  // If in session, maybe we don't want the sidebar? 
  // The requirement implies a web app, usually session is full screen or focused.
  // But for now, I'll keep it consistent or simple.
  const isSession = pathname.startsWith('/session');

  if (isSession) {
    return <>{children}</>;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light">
        <div style={{ height: 32, margin: 16, background: 'rgba(0, 0, 0, 0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {!collapsed && <span style={{ fontWeight: 'bold', color: '#333' }}>Memento 1on1</span>}
            {collapsed && <span style={{ fontWeight: 'bold', color: '#333' }}>M</span>}
        </div>
        <Menu
          theme="light"
          mode="inline"
          defaultSelectedKeys={['dashboard']}
          selectedKeys={[getSelectedKey()]}
          items={items}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 500 }}>Manager User</span>
            <Avatar icon={<UserOutlined />} />
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: '#fff',
            borderRadius: 8,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppShell;
