import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'ユーザーIDが必要です' }, { status: 400 });
    }

    console.log('Mock LINE disconnect for user:', userId);
    
    // モックレスポンス
    return NextResponse.json({
      success: true,
      message: 'LINE連携を解除しました（モック実装）',
      isMock: true
    });

  } catch (error: unknown) {
    console.error('LINE disconnect error:', error);
    return NextResponse.json({ 
      error: 'LINE連携の解除に失敗しました',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}