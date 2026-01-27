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

/**
 * Get OAuth redirect URL for authentication callbacks
 * Uses NEXT_PUBLIC_SITE_URL environment variable if available,
 * otherwise falls back to window.location.origin (client-side only)
 * 
 * @returns Full redirect URL including /auth/callback path
 */
export const getOAuthRedirectUrl = (): string => {
  // Use environment variable if available (works in both build and runtime)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
  }
  
  // Fallback to window.location.origin only in client-side
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  
  // During build/server-side rendering without env var, return empty
  // This should only happen if NEXT_PUBLIC_SITE_URL is not set
  return '/auth/callback';
};
