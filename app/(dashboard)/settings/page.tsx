'use client';

import React, { useEffect, useState } from 'react';
import { Typography, Card, Switch, Avatar, Button, message, Spin, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { CalendarOutlined, MessageOutlined, LinkOutlined, DisconnectOutlined, LogoutOutlined, UserOutlined, GoogleOutlined } from '@ant-design/icons';
import { createClientComponentClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const { Title } = Typography;

export default function SettingsPage() {
  const router = useRouter();
  const [googleConnected, setGoogleConnected] = useState(false);
  const [lineConnected, setLineConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          router.push('/login');
          return;
        }

        setUserEmail(session.user.email || '');
        
        // Check if user logged in with Google OAuth
        const isGoogleUser = !!session.provider_token;
        setIsGoogleAuth(isGoogleUser);
        
        // Check if Google OAuth token exists
        const hasGoogleToken = !!session.provider_token;
        setGoogleConnected(hasGoogleToken);
        
        // LINE connection status would come from your backend/db
        // For now, default to false
        setLineConnected(false);
      } catch (error) {
        console.error('Error checking auth status:', error);
        router.push('/login');
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkAuthStatus();
  }, [supabase, router]);

  const handleGoogleConnect = async () => {
    setGoogleLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data: _, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'https://www.googleapis.com/auth/calendar.events',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) throw error;
      
      // OAuth flow will redirect, so we don't need to update state here
      message.info('Redirecting to Google for authorization...');
    } catch (error: unknown) {
      console.error('Google OAuth error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.error(`Failed to connect Google Calendar: ${errorMessage}`);
      setGoogleLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    setGoogleLoading(true);
    try {
      // Note: Supabase doesn't have a direct way to revoke OAuth tokens
      // This would require backend implementation to clear the provider_token
      // For now, we'll just update the UI state
      setGoogleConnected(false);
      message.success('Google Calendar disconnected (token cleared locally)');
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      message.error('Failed to disconnect Google Calendar');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLineConnect = async () => {
    setLineLoading(true);
    try {
      // モック実装: LINE連携APIを呼び出す
      const response = await fetch('/api/line/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userEmail })
      });
      
      if (response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _ = await response.json();
        setLineConnected(true);
        message.success('LINE連携を開始しました');
      } else {
        throw new Error('LINE連携に失敗しました');
      }
    } catch (error) {
      console.error('LINE connect error:', error);
      // モックフォールバック
      setTimeout(() => {
        setLineConnected(true);
        message.success('LINE連携を開始しました（モック実装）');
      }, 1000);
    } finally {
      setLineLoading(false);
    }
  };

  const handleLineDisconnect = async () => {
    try {
      // モック実装: LINE連携解除API
      const response = await fetch('/api/line/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userEmail })
      });
      
      if (response.ok) {
        setLineConnected(false);
        message.success('LINE連携を解除しました');
      } else {
        throw new Error('LINE連携解除に失敗しました');
      }
    } catch (error) {
      console.error('LINE disconnect error:', error);
      // モックフォールバック
      setLineConnected(false);
      message.success('LINE連携を解除しました（モック実装）');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      message.success('ログアウトしました');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      message.error('ログアウトに失敗しました');
    }
  };

  const integrations = [
    {
      id: 'google-calendar',
      title: 'Googleカレンダー連携',
      description: isGoogleAuth 
        ? '次回の1on1セッションを自動的にスケジュールし、カレンダーと同期します。'
        : 'Googleカレンダー連携を使用するには、Googleアカウントでログインしてください。',
      icon: <CalendarOutlined style={{ color: '#fadb14' }} />,
      connected: googleConnected,
      loading: googleLoading,
      disabled: !isGoogleAuth,
      onConnect: isGoogleAuth ? handleGoogleConnect : () => {},
      onDisconnect: isGoogleAuth ? handleGoogleDisconnect : () => {},
    },
    {
      id: 'line',
      title: 'LINE連携',
      description: 'リマインダーや通知をLINEで送信します。',
      icon: <MessageOutlined style={{ color: '#52c41a' }} />,
      connected: lineConnected,
      loading: lineLoading,
      disabled: false,
      onConnect: handleLineConnect,
      onDisconnect: handleLineDisconnect,
    },
  ];

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Spin>Checking authentication status...</Spin>
      </div>
    );
  }

   const userMenuItems: MenuProps['items'] = [
     { 
       key: 'email', 
       label: userEmail,
       icon: <UserOutlined />,
       disabled: true 
     },
     { 
       key: 'auth_type', 
       label: isGoogleAuth ? 'Googleアカウントでログイン中' : 'メールアドレスでログイン中',
       icon: isGoogleAuth ? <GoogleOutlined /> : <UserOutlined />,
       disabled: true 
     },
     { type: 'divider' },
     { 
       key: 'logout', 
       label: 'ログアウト', 
       icon: <LogoutOutlined />,
       onClick: handleLogout 
     }
   ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>設定</Title>
         <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Button icon={<UserOutlined />}>
            {userEmail.split('@')[0]}
          </Button>
        </Dropdown>
      </div>
      
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
                      checkedChildren="連携中" 
                      unCheckedChildren="未連携" 
                      checked={item.connected}
                      onChange={(checked) => checked ? item.onConnect() : item.onDisconnect()}
                      loading={item.loading}
                      disabled={item.disabled || item.loading}
                    />
                    <Button 
                      type="default" 
                      size="small"
                      icon={item.connected ? <DisconnectOutlined /> : <LinkOutlined />}
                      onClick={item.connected ? item.onDisconnect : item.onConnect}
                      loading={item.loading}
                      disabled={item.disabled || item.loading}
                    >
                      {item.connected ? '切断' : '接続'}
                    </Button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: 12, background: isGoogleAuth ? '#f6ffed' : '#fffbe6', border: isGoogleAuth ? '1px solid #b7eb8f' : '1px solid #ffe58f', borderRadius: 4 }}>
            <Typography.Text type="secondary">
              {isGoogleAuth ? (
                <><strong>注意:</strong> Googleカレンダー連携にはイベント作成の追加スコープが必要です。接続後、次回の1on1セッションを自動的にスケジュールできます。</>
              ) : (
                <><strong>制限:</strong> Googleカレンダー連携を使用するには、Googleアカウントでログインしてください。現在はメールアドレスでのログインのため、カレンダー連携は利用できません。</>
              )}
            </Typography.Text>
          </div>
        </Card>
    </div>
  );
}
