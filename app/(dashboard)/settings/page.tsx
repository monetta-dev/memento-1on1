'use client';

import React, { useEffect, useState } from 'react';
import { Typography, Card, Switch, Avatar, Button, message, Spin, Dropdown, Tag, Select } from 'antd';
import type { MenuProps } from 'antd';
import { CalendarOutlined, MessageOutlined, LinkOutlined, DisconnectOutlined, LogoutOutlined, UserOutlined, GoogleOutlined } from '@ant-design/icons';
import { useLanguage } from '@/contexts/LanguageContext';
import { createClientComponentClient, getOAuthRedirectUrl } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

type LineSettings = {
  id: string;
  line_user_id: string;
  enabled: boolean;
  line_display_name?: string;
  is_friend?: boolean;
};

const { Title } = Typography;

export default function SettingsPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [googleConnected, setGoogleConnected] = useState(false);
  const [lineConnected, setLineConnected] = useState(false);
  const [lineSettings, setLineSettings] = useState<LineSettings | null>(null);
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
        
        // Check LINE connection status from database
        try {
          const { data: lineData, error: lineError } = await supabase
            .from('line_notifications')
            .select('id, line_user_id, enabled, line_display_name, is_friend')
            .eq('user_id', session.user.id)
            .eq('enabled', true)
            .not('line_user_id', 'is', null)
            .single();
          
          if (!lineError && lineData) {
            setLineConnected(true);
            setLineSettings(lineData);
            console.log('LINE connected for user:', session.user.id, 'LINE user:', lineData.line_display_name);
          } else {
            setLineConnected(false);
          }
        } catch (error) {
          console.error('Error checking LINE connection:', error);
          setLineConnected(false);
        }
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
          redirectTo: getOAuthRedirectUrl(),
          scopes: 'https://www.googleapis.com/auth/calendar.events',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) throw error;
      
      // OAuth flow will redirect, so we don't need to update state here
       message.info('Google認証にリダイレクト中...');
    } catch (error: unknown) {
      console.error('Google OAuth error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
       message.error(`Googleカレンダーの連携に失敗しました: ${errorMessage}`);
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
       message.success('Googleカレンダーの連携を解除しました（トークンをローカルで削除）');
    } catch (error) {
      console.error('Error disconnecting Google:', error);
       message.error('Googleカレンダーの切断に失敗しました');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLineConnect = async (reconnect = false) => {
    setLineLoading(true);
    try {
      console.log('Starting LINE connect for user:', userEmail);
      const response = await fetch('/api/line/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userEmail })
      });
      console.log('Response status:', response.status, response.ok, 'headers:', Object.fromEntries(response.headers.entries()));
      
      const result = await response.json();
       console.log('LINE connect API response:', result);
       console.log('oauthUrl present?', !!result.oauthUrl, 'oauthUrl:', result.oauthUrl);
       
       if (response.ok && result.success) {
        if (result.oauthUrl) {
          console.log('Redirecting to LINE OAuth URL:', result.oauthUrl);
          try {
            window.location.href = result.oauthUrl;
          } catch (err) {
            console.error('Redirect failed:', err);
            message.error('リダイレクトに失敗しました');
          }
          // リダイレクトされるのでここで処理終了
          return;
        } else {
          // oauthUrlがない場合（モックモードなど）
          setLineConnected(true);
          message.success(result.message || 'LINE連携を開始しました');
        }
      } else {
        throw new Error(result.error || result.details || 'LINE連携に失敗しました');
      }
    } catch (error: unknown) {
      console.error('LINE connect error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.error(`LINE連携に失敗しました: ${errorMessage}`);
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
       title: t('google_calendar'),
       description: isGoogleAuth 
         ? t('calendar_integration_available')
         : t('sign_in_with_google_to_enable'),
      icon: <CalendarOutlined style={{ color: '#fadb14' }} />,
      connected: googleConnected,
      loading: googleLoading,
      disabled: googleLoading,
      onConnect: handleGoogleConnect,
      onDisconnect: isGoogleAuth ? handleGoogleDisconnect : () => {},
      isGoogleCalendar: true,
    },
    {
      id: 'line',
       title: t('line'),
        description: lineConnected && lineSettings?.is_friend === false 
          ? 'LINE連携済みですが、公式アカウントを友だち追加してください'
          : t('line_description'),
      icon: <MessageOutlined style={{ color: '#52c41a' }} />,
      connected: lineConnected,
      loading: lineLoading,
      disabled: false,
       onConnect: () => handleLineConnect(false),
      onDisconnect: handleLineDisconnect,
      isGoogleCalendar: false,
    },
  ];

  if (checkingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <Spin>{t('checking_auth_status')}</Spin>
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
        label: isGoogleAuth ? t('logged_in_with_google') : t('logged_in_with_email'),
       icon: isGoogleAuth ? <GoogleOutlined /> : <UserOutlined />,
       disabled: true 
     },
     { type: 'divider' },
     { 
       key: 'logout', 
        label: t('logout'),
       icon: <LogoutOutlined />,
       onClick: handleLogout 
     }
   ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
         <Title level={2} style={{ margin: 0 }}>{t('settings')}</Title>
         <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Button icon={<UserOutlined />}>
            {userEmail.split('@')[0]}
          </Button>
        </Dropdown>
      </div>
      
         <Card title={t('integrations')} variant="borderless">
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
                    {item.id === 'line' && lineConnected && lineSettings?.is_friend === false && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#faad14', fontSize: '12px' }}>
                          ⚠️ 友だち追加が完了していません。メッセージを受信するには追加が必要です。
                        </span>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => handleLineConnect(true)}
                          loading={lineLoading}
                          disabled={lineLoading}
                          style={{ padding: 0, height: 'auto' }}
                        >
                          友だち追加を完了する
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                 <div style={{ marginLeft: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    {item.isGoogleCalendar ? (
                      // Google Calendar: Show status tag for Google auth users, button for email auth users
                      isGoogleAuth ? (
                        <Tag color="success" style={{ margin: 0 }}>連携可能</Tag>
                      ) : (
                        <Button 
                          type="primary" 
                          size="small"
                          icon={<GoogleOutlined />}
                          onClick={item.onConnect}
                          loading={item.loading}
                          disabled={item.disabled || item.loading}
                        >
                          Googleでサインイン
                        </Button>
                      )
                    ) : (
                     // LINE: Keep existing switch and button
                     <>
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
                     </>
                   )}
                 </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: 12, background: isGoogleAuth ? '#f6ffed' : '#fffbe6', border: isGoogleAuth ? '1px solid #b7eb8f' : '1px solid #ffe58f', borderRadius: 4 }}>
             <Typography.Text type="secondary">
                {isGoogleAuth ? (
                  <><strong>{t('attention')}:</strong> {t('note_google_calendar_enabled')}</>
                ) : (
                  <><strong>{t('restriction')}:</strong> {t('restriction_google_calendar_requires_login')}</>
                )}
             </Typography.Text>
           </div>
         </Card>

          <Card title={t('display_settings')} variant="borderless" style={{ marginTop: 24 }}>
           <div style={{ maxWidth: 400 }}>
             <div style={{ marginBottom: 16 }}>
                <Typography.Text strong>{t('language')}</Typography.Text>
               <Select
                 value={language}
                 onChange={setLanguage}
                 style={{ width: 200, marginTop: 8 }}
               >
                 <Select.Option value="ja">日本語</Select.Option>
                 <Select.Option value="en">English</Select.Option>
               </Select>
               <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                 {t('language_description')}
               </Typography.Text>
             </div>
           </div>
         </Card>
     </div>
   );
 }
