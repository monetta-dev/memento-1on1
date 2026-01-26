import { createBrowserClient, createServerClient as createServerClientFromSSR } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Ensure client is only created if env vars are present (to avoid build errors)
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// For client components
export const createClientComponentClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

// For server components (requires cookies)
export const createServerClient = (cookieStore: {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: { name: string; value: string; options: Record<string, unknown> }[]) => void;
}) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createServerClientFromSSR(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: cookieStore.getAll,
      setAll: cookieStore.setAll,
    },
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  });
};

// For route handlers (App Router)
export const createRouteHandlerClient = (cookieStore?: {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: { name: string; value: string; options: Record<string, unknown> }[]) => void;
}) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  if (cookieStore) {
    // Use createServerClient for proper auth with cookies
    return createServerClientFromSSR(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: cookieStore.getAll,
        setAll: cookieStore.setAll,
      },
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      },
    });
  }
  
  // Fallback: simple client without cookies (for backward compatibility)
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    }
  });
};
