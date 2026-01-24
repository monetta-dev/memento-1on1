import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionId, notificationType, message } = await req.json();
    
    if (!userId || !notificationType) {
      return NextResponse.json({ error: '必須パラメータが不足しています' }, { status: 400 });
    }

    console.log('Mock LINE notification send:', {
      userId,
      sessionId,
      notificationType,
      message
    });
    
    // モックレスポンス
    return NextResponse.json({
      success: true,
      message: 'LINE通知を送信しました（モック実装）',
      notificationId: `mock-notification-${Date.now()}`,
      sentAt: new Date().toISOString(),
      isMock: true
    });

  } catch (error: unknown) {
    console.error('LINE send error:', error);
    return NextResponse.json({ 
      error: 'LINE通知の送信に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}