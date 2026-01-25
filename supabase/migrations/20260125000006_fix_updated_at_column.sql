-- Fix missing updated_at column and trigger for sessions table
-- This migration ensures the updated_at column exists and the trigger works correctly

-- 1. Add updated_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.sessions 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());
        RAISE NOTICE 'Added updated_at column to sessions table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in sessions table';
    END IF;
END
$$;

-- 2. Create or replace the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Drop existing trigger if exists (to avoid duplicate)
DROP TRIGGER IF EXISTS update_sessions_updated_at ON public.sessions;

-- 4. Create trigger
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON public.sessions 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Also ensure user_id column exists (should already be added by previous migration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.sessions 
        ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added user_id column to sessions table';
    ELSE
        RAISE NOTICE 'user_id column already exists in sessions table';
    END IF;
END
$$;

-- 6. Update existing rows to have updated_at = created_at if updated_at is null (only if column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'updated_at'
    ) THEN
        UPDATE public.sessions 
        SET updated_at = COALESCE(updated_at, created_at, NOW())
        WHERE updated_at IS NULL;
        RAISE NOTICE 'Updated existing rows with null updated_at';
    ELSE
        RAISE NOTICE 'updated_at column does not exist, skipping update';
    END IF;
END
$$;