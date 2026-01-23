'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // セッションを取得
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          router.push('/login');
          return;
        }

        if (session) {
          // セッションがあればダッシュボードへ
          router.push('/');
        } else {
          // セッションがなければログインページへ
          router.push('/login');
        }
      } catch (err) {
        console.error('Callback error:', err);
        router.push('/login');
      }
    };

    handleCallback();
  }, [router, supabase]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <div style={{ 
        textAlign: 'center', 
        color: 'white',
        padding: 20 
      }}>
        <h1>認証処理中...</h1>
        <p>ログイン情報を確認しています。しばらくお待ちください。</p>
      </div>
    </div>
  );
}