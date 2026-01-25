-- Fix RLS policies to allow public access for MVP (temporary fix for "Failed to sync session update" error)
-- This migration replaces the authenticated-only policies with public access policies

-- Drop existing RLS policies for subordinates and sessions that require authentication
DROP POLICY IF EXISTS "Authenticated users can manage subordinates" ON public.subordinates;
DROP POLICY IF EXISTS "Authenticated users can manage sessions" ON public.sessions;

-- Create new public access policies for MVP development
-- For production, replace these with proper authentication-based policies
CREATE POLICY "Allow public access to subordinates" ON public.subordinates
  FOR ALL USING (true);

CREATE POLICY "Allow public access to sessions" ON public.sessions
  FOR ALL USING (true);

-- Note: Profiles, line_notifications, and notification_logs keep their existing policies
-- which require authentication (auth.uid() = user_id) as they contain user-specific data