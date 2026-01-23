-- Memento 1on1 Supabase Database Schema
-- Run this SQL in your Supabase project SQL editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create subordinates table
CREATE TABLE IF NOT EXISTS public.subordinates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    traits JSONB DEFAULT '[]'::jsonb,
    last_one_on_one TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subordinate_id UUID NOT NULL REFERENCES public.subordinates(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    mode TEXT NOT NULL CHECK (mode IN ('face-to-face', 'web')),
    theme TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'live')),
    transcript JSONB DEFAULT '[]'::jsonb,
    mind_map_data JSONB DEFAULT '{"nodes": [], "edges": []}'::jsonb,
    summary TEXT,
    action_items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table for user authentication (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'manager' CHECK (role IN ('manager', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subordinates_department ON public.subordinates(department);
CREATE INDEX IF NOT EXISTS idx_subordinates_created_at ON public.subordinates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_subordinate_id ON public.sessions(subordinate_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.sessions(date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Enable Row Level Security (RLS)
ALTER TABLE public.subordinates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles: users can only see their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Subordinates: authenticated users can perform all operations
CREATE POLICY "Authenticated users can manage subordinates" ON public.subordinates
    FOR ALL USING (auth.role() = 'authenticated');

-- Sessions: authenticated users can manage sessions
CREATE POLICY "Authenticated users can manage sessions" ON public.sessions
    FOR ALL USING (auth.role() = 'authenticated');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_subordinates_updated_at BEFORE UPDATE ON public.subordinates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional)
INSERT INTO public.subordinates (name, role, department, traits) VALUES
    ('山田 太郎', 'エンジニア', '開発部', '["詳細志向", "論理的", "協調性"]'),
    ('佐藤 花子', 'デザイナー', 'デザイン部', '["創造的", "几帳面", "コミュニケーション能力"]')
ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE public.subordinates IS '部下情報を管理するテーブル';
COMMENT ON TABLE public.sessions IS '1on1セッション記録を管理するテーブル';
COMMENT ON TABLE public.profiles IS 'ユーザープロファイル情報を管理するテーブル';