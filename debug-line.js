import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hslojwtodnfaucrnbcdc.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_wG8r3TUIm2Q9oKK_ja5eyA_q-6QtBI8';
const testEmail = process.env.TEST_USER_EMAIL || 'test@memento-1on1.com';
const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function main() {
  console.log('Logging in with test user:', testEmail);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  if (error) {
    console.error('Login failed:', error.message);
    process.exit(1);
  }
  console.log('Logged in user:', data.user.email);
  
  // Get session cookie (Supabase stores session in cookie)
  // We'll use the supabase client to get session, but we need to manually extract cookie.
  // For simplicity, we'll call the API with the session cookie that supabase client sets.
  // However, supabase-js doesn't expose cookie directly. Let's use the access token.
  const accessToken = data.session.access_token;
  
  // Make request to LINE connect endpoint
  const response = await fetch('http://localhost:3000/api/line/connect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ userId: data.user.email }),
  });
  
  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  const body = await response.json();
  console.log('Response body:', JSON.stringify(body, null, 2));
  
  if (body.oauthUrl) {
    console.log('OAuth URL present, redirect would happen.');
  } else {
    console.log('OAuth URL missing!');
  }
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});