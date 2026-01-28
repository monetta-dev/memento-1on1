import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { userId, reconnect = false } = await req.json();
    console.log('LINE connect request headers:', Object.fromEntries(req.headers.entries()));
    console.log('LINE connect request body userId:', userId);
    
    if (!userId) {
      return NextResponse.json({ error: 'ユーザーIDが必要です' }, { status: 400 });
    }

    // LINE OAuth設定の確認
    const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
    const redirectUri = process.env.LINE_REDIRECT_URI;
    
    if (!channelId || !redirectUri) {
      console.error('Missing LINE configuration:', { 
        hasChannelId: !!channelId,
        hasRedirectUri: !!redirectUri 
      });
      return NextResponse.json({ 
        error: 'LINE連携の設定が不足しています',
        details: '環境変数LINE_LOGIN_CHANNEL_IDとLINE_REDIRECT_URIを確認してください'
      }, { status: 500 });
    }

    // セキュアなstateパラメータを生成（CSRF保護）
    const state = crypto.randomBytes(32).toString('hex');
    
    // stateをcookieに保存（コールバックで検証するため）
    const cookieStore = await cookies();
    cookieStore.set('line_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10分間有効
      path: '/',
    });

    // ユーザーIDも一時的に保存（コールバックで使用）
    cookieStore.set('line_oauth_user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10分間有効
      path: '/',
    });

    // LINE OAuth URLを構築
    const lineOAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: channelId,
      redirect_uri: redirectUri,
      state: state,
      scope: 'profile openid',
      bot_prompt: reconnect ? 'aggressive' : 'normal',
    });

    lineOAuthUrl.search = params.toString();
    
    console.log('LINE OAuth URL generated for user:', userId);
    console.log('LINE OAuth URL:', lineOAuthUrl.toString());
    console.log('Channel ID:', channelId, 'Redirect URI:', redirectUri);
    
    return NextResponse.json({
      success: true,
      message: 'LINE認証ページにリダイレクトします',
      oauthUrl: lineOAuthUrl.toString(),
      isMock: false
    });

  } catch (error: unknown) {
    console.error('LINE connect error:', error);
    return NextResponse.json({ 
      error: 'LINE連携の開始に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}