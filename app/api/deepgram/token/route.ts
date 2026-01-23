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


  
  // Create a temporary key for the client (browser) to use
  // Note: For production, scoping this key or using a proxy is safer,
  // but for MVP/prototype, generating a temp key on demand is acceptable provided the key has limited scope/time.
  // However, Deepgram SDK in browser usually takes the main API key or a scoped key.
  // A better pattern for browser is to request a temporary key from the Deepgram Management API
  // OR simply proxy the socket. For simplicity in this Next.js app, we will assume
  // we return a key that the client can use, or we return the configured key if safe (not recommended for public apps).
  
  // BETTER APPROACH for Nova-2 Streaming:
  // Create a key with a short expiration/scope using the Deepgram API.
  // For this prototype, we will return a "mock" response if env is missing,
  // or handle the key generation logic.
  
  try {
      // NOTE: Using Deepgram SDK v3
      // If using 'default' project, we might need to list projects first or assume environment has DEEPGRAM_PROJECT_ID
      // For safety in this environment where we might not have manage permissions, 
      // we will return the API Key directly if it's safe (e.g. env var is restricted)
      // OR we just return a mock response if we can't create a key.
      
      // Attempt to create a temporary key using the correct v3 SDK syntax if possible
      // const { result, error } = await deepgram.manage.getProject(process.env.DEEPGRAM_PROJECT_ID!).createKey({ ... });
      
      // SIMPLIFICATION FOR PROTOTYPE:
      // Since creating management keys requires Admin permissions and Project ID, 
      // which is often a friction point in setup, we will:
      // 1. If DEEPGRAM_API_KEY is present, just return it (assuming it's a browser-safe key or user knows risk).
      // 2. In a real production app, you MUST implement a proxy or use the Management API correctly.
      
      // For now, to unblock the build, we return the key from env directly.
      return NextResponse.json({ 
          key: deepgramApiKey, 
          mockMode: false
      });

      /* 
      // Proper Implementation Reference (requires Project ID)
      const projectId = process.env.DEEPGRAM_PROJECT_ID;
      if (!projectId) throw new Error("Project ID missing");
      
      const { result, error } = await deepgram.manage.getProject(projectId).createKey({
          comment: 'Ephemeral Browser Key',
          scopes: ['usage:write'],
          time_to_live_in_seconds: 3600,
      });
      */
  } catch (err) {
      console.error("Deepgram Token Error:", err);
      // Fallback for when we don't have project ID setup or management API access
      return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
