-- Add user_id column to sessions table for proper user isolation
-- This migration ensures each session is owned by a specific user

-- 1. Add user_id column to sessions table (nullable initially for existing data)
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create index for better performance on user_id queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);

-- 3. Drop the public access policy that allows all users to see all sessions
DROP POLICY IF EXISTS "Allow public access to sessions" ON public.sessions;

-- 4. Create new RLS policies for user-specific session access
-- Users can view their own sessions OR sessions with NULL user_id (for backward compatibility)
CREATE POLICY "Users can view own or legacy sessions" ON public.sessions
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can insert sessions only with their own user_id
CREATE POLICY "Users can insert own sessions" ON public.sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions OR sessions with NULL user_id
CREATE POLICY "Users can update own or legacy sessions" ON public.sessions
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can delete their own sessions OR sessions with NULL user_id
CREATE POLICY "Users can delete own or legacy sessions" ON public.sessions
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Note: Existing sessions with NULL user_id will be accessible to all authenticated users
-- This maintains backward compatibility while allowing new sessions to be user-specific
-- For production, consider updating NULL user_id sessions to specific users over time