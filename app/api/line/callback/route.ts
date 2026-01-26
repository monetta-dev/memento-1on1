import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // エラーチェック
    if (error) {
      console.error('LINE OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL('/settings?line_error=' + encodeURIComponent(errorDescription || error), req.url)
      );
    }

    if (!code || !state) {
      console.error('Missing code or state in callback');
      return NextResponse.redirect(
        new URL('/settings?line_error=Missing authentication parameters', req.url)
      );
    }

    // Cookieから保存したstateとユーザーIDを取得
    const cookieStore = await cookies();
    const savedState = cookieStore.get('line_oauth_state')?.value;
    const userId = cookieStore.get('line_oauth_user_id')?.value;

    // Cookieをクリア
    cookieStore.delete('line_oauth_state');
    cookieStore.delete('line_oauth_user_id');

    // State検証（CSRF保護）
    if (!savedState || savedState !== state) {
      console.error('Invalid state parameter:', { savedState, state });
      return NextResponse.redirect(
        new URL('/settings?line_error=Invalid authentication state', req.url)
      );
    }

    if (!userId) {
      console.error('No user ID found in cookies');
      return NextResponse.redirect(
        new URL('/settings?line_error=Session expired', req.url)
      );
    }

    // LINE OAuth設定
    const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
    const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
    const redirectUri = process.env.LINE_REDIRECT_URI;
    const siteUrl = process.env.LINE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;

    if (!channelId || !channelSecret || !redirectUri) {
      console.error('Missing LINE configuration');
      return NextResponse.redirect(
        new URL('/settings?line_error=LINE configuration missing', req.url)
      );
    }

    // 1. アクセストークンの取得
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: channelId,
        client_secret: channelSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('LINE token exchange failed:', tokenResponse.status, errorText);
      return NextResponse.redirect(
        new URL('/settings?line_error=Failed to exchange token', req.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;

    // 2. ユーザープロフィールの取得
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      console.error('LINE profile fetch failed:', profileResponse.status);
      // トークンは取得できたので、プロフィールなしでも続行
    }

    let lineUserId = 'unknown';
    let lineDisplayName = 'LINE User';

    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      lineUserId = profileData.userId;
      lineDisplayName = profileData.displayName || 'LINE User';
    }

    // 3. データベースに保存
    // Create adapter for cookie store
    const cookieAdapter = {
      getAll: () => {
        const cookies = cookieStore.getAll();
        return cookies.map(cookie => ({
          name: cookie.name,
          value: cookie.value,
        }));
      },
      setAll: (cookies: { name: string; value: string; options: Record<string, unknown> }[]) => {
        cookies.forEach(cookie => {
          cookieStore.set(cookie.name, cookie.value, cookie.options);
        });
      },
    };
    
    const supabase = createRouteHandlerClient(cookieAdapter);
    
    // まず現在のセッションからユーザーIDを取得（Supabase Auth）
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('No Supabase session found');
      return NextResponse.redirect(
        new URL('/login?line_error=Please login first', req.url)
      );
    }

    const authUserId = session.user.id;

    // line_notificationsテーブルに保存または更新
    const { data, error: dbError } = await supabase
      .from('line_notifications')
      .upsert({
        user_id: authUserId,
        line_user_id: lineUserId,
        line_access_token: accessToken, // 注意: 実際は暗号化が必要
        line_display_name: lineDisplayName,
        enabled: true,
        notification_types: ['reminder'],
        remind_before_minutes: 60, // デフォルト1時間前
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (dbError) {
      console.error('Database error saving LINE notification settings:', dbError);
      return NextResponse.redirect(
        new URL('/settings?line_error=Failed to save LINE settings', req.url)
      );
    }

    console.log('LINE connection successful for user:', authUserId, 'LINE user:', lineDisplayName);

    // 4. 成功したら設定ページにリダイレクト
    return NextResponse.redirect(
      new URL('/settings?line_success=LINE連携が完了しました', req.url)
    );

  } catch (error: unknown) {
    console.error('LINE callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(
      new URL(`/settings?line_error=${encodeURIComponent(errorMessage)}`, req.url)
    );
  }
}