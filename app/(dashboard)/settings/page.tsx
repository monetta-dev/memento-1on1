'use client';

import React from 'react';
import { Typography, Card, Switch, Avatar, Button } from 'antd';
import { CalendarOutlined, MessageOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function SettingsPage() {
  const [integrations, setIntegrations] = React.useState([
    {
      id: 'google-calendar',
      title: 'Google Calendar Integration',
      description: 'Automatically schedule next 1on1 sessions and sync with your calendar.',
      icon: <CalendarOutlined style={{ color: '#fadb14' }} />,
      connected: false,
      loading: false,
    },
    {
      id: 'line',
      title: 'LINE Integration',
      description: 'Send reminders and notifications via LINE.',
      icon: <MessageOutlined style={{ color: '#52c41a' }} />,
      connected: false,
      loading: false,
    },
  ]);

  const handleConnect = (id: string) => {
    setIntegrations(prev => prev.map(item => 
      item.id === id ? { ...item, loading: true } : item
    ));
    // Simulate API call
    setTimeout(() => {
      setIntegrations(prev => prev.map(item => 
        item.id === id ? { ...item, connected: true, loading: false } : item
      ));
    }, 1500);
  };

  const handleDisconnect = (id: string) => {
    setIntegrations(prev => prev.map(item => 
      item.id === id ? { ...item, connected: false } : item
    ));
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Settings</Title>
      
       <Card title="Integrations" variant="borderless">
         <div className="ant-list ant-list-split">
           {integrations.map((item) => (
             <div key={item.id} className="ant-list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
               <div className="ant-list-item-meta" style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                 <div className="ant-list-item-meta-avatar" style={{ marginRight: 16 }}>
                   <Avatar icon={item.icon} style={{ backgroundColor: '#fff', border: '1px solid #f0f0f0', color: '#000' }} />
                 </div>
                 <div className="ant-list-item-meta-content">
                   <h4 className="ant-list-item-meta-title" style={{ marginBottom: 4 }}>{item.title}</h4>
                   <div className="ant-list-item-meta-description" style={{ color: 'rgba(0, 0, 0, 0.45)' }}>{item.description}</div>
                 </div>
               </div>
               <div style={{ marginLeft: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                   <Switch 
                     checkedChildren="Connected" 
                     unCheckedChildren="Disconnected" 
                     checked={item.connected}
                     onChange={(checked) => checked ? handleConnect(item.id) : handleDisconnect(item.id)}
                     loading={item.loading}
                   />
                   <Button 
                     type="default" 
                     size="small"
                     onClick={() => alert(`Configure ${item.title}`)}
                   >
                     Configure
                   </Button>
               </div>
             </div>
           ))}
         </div>
       </Card>
    </div>
  );
}
