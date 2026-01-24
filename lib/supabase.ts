import { createBrowserClient } from '@supabase/ssr';
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
export const createServerClient = (cookies: {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: { name: string; value: string; options: any }[]) => void;
}) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  // Using createClient for server components (simplified version)
  // In a real implementation, you would use createServerClient from @supabase/ssr
  return createClient(supabaseUrl, supabaseAnonKey);
};

// For route handlers (App Router)
export const createRouteHandlerClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  // Create a simple client for route handlers
  // Note: For proper auth, you'd want to use createServerClient with cookies
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    }
  });
};
