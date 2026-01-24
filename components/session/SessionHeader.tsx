'use client';

import React from 'react';
import { Layout, Typography, Tag, Flex, Space } from 'antd';

const { Header } = Layout;
const { Title, Text } = Typography;

interface Subordinate {
  id: string;
  name: string;
}

interface SessionData {
  id: string;
  theme: string;
  mode: 'web' | 'face-to-face';
  subordinateId: string;
}

interface SessionHeaderProps {
  subordinate?: Subordinate;
  sessionData?: SessionData;
}

const SessionHeader: React.FC<SessionHeaderProps> = ({ subordinate, sessionData }) => {
  return (
    <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 24px' }}>
      <Flex justify="space-between" align="center">
        <Space size={16} align="center">
          <Title level={4} style={{ margin: 0 }}>
            1on1 with {subordinate?.name || 'Subordinate'}
          </Title>
          <Tag color="blue">{sessionData?.theme}</Tag>
          <Tag color={sessionData?.mode === 'web' ? 'cyan' : 'green'}>
            {sessionData?.mode === 'web' ? 'Web Mode' : 'Face-to-Face'}
          </Tag>
        </Space>
        <Text type="secondary">{new Date().toDateString()}</Text>
      </Flex>
    </Header>
  );
};

export default SessionHeader;