import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

  if (!deepgramApiKey) {
    return NextResponse.json({ 
      error: 'Deepgram API Key not configured',
      mockMode: true 
    });
  }

  try {
    const response = await fetch('https://api.deepgram.com/v1/auth/grant', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ttl_seconds: 3600 }) // 1時間有効
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Deepgram grant API error:', response.status, errorText);
      throw new Error(`Deepgram API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.access_token) {
      throw new Error('No access_token in Deepgram response');
    }

    return NextResponse.json({ 
      key: data.access_token, 
      expiresIn: data.expires_in,
      mockMode: false
    });

  } catch (err) {
    console.error('Deepgram Token Error:', err);
    
    // エラー時に安全なフォールバック: 一時キー生成失敗時はmockModeで返す
    return NextResponse.json({ 
      error: 'Failed to generate temporary token',
      mockMode: true 
    }, { status: 500 });
  }
}
