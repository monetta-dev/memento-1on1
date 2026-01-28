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
    
    const botPromptValue = reconnect ? 'aggressive' : 'normal';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: channelId,
      redirect_uri: redirectUri,
      state: state,
      scope: 'profile openid',
      bot_prompt: botPromptValue,
    });

    lineOAuthUrl.search = params.toString();
    
    // 詳細な診断ログ
    console.log('🔍 LINE Connect Debug - Start');
    console.log('🔍 User:', userId);
    console.log('🔍 reconnect parameter:', reconnect);
    console.log('🔍 bot_prompt value:', botPromptValue);
    console.log('🔍 Channel ID:', channelId ? `[SET] (length: ${channelId.length})` : '[NOT SET]');
    console.log('🔍 Redirect URI:', redirectUri);
    console.log('🔍 State generated (first 8 chars):', state.substring(0, 8), '...');
    
    // OAuth URLのパラメータを解析してログ出力（機密情報マスク）
    const oauthUrlString = lineOAuthUrl.toString();
    console.log('🔍 Generated OAuth URL:', oauthUrlString);
    
    // URLパラメータを解析して確認
    try {
      const urlObj = new URL(oauthUrlString);
      const paramsObj = Object.fromEntries(urlObj.searchParams.entries());
      console.log('🔍 OAuth URL Parameters:', {
        response_type: paramsObj.response_type,
        client_id: paramsObj.client_id ? '[SET]' : '[MISSING]',
        redirect_uri: paramsObj.redirect_uri,
        state: paramsObj.state ? '[SET]' : '[MISSING]',
        scope: paramsObj.scope,
        bot_prompt: paramsObj.bot_prompt || '[MISSING - THIS IS A PROBLEM]'
      });
    } catch (error) {
      console.error('❌ Failed to parse OAuth URL:', error);
    }
    
    console.log('🔍 LINE Connect Debug - End');
    
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