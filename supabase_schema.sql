-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Subordinates Table
create table public.subordinates (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  role text,
  department text,
  traits jsonb default '[]'::jsonb, -- Array of strings e.g. ["Logical", "Visual"]
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Sessions Table
create table public.sessions (
  id uuid default uuid_generate_v4() primary key,
  subordinate_id uuid references public.subordinates(id) on delete cascade not null,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  mode text check (mode in ('web', 'face-to-face')) not null,
  theme text,
  summary text,
  status text check (status in ('scheduled', 'live', 'completed')) default 'scheduled',
  
  -- JSONB columns for flexible data storage
  transcript jsonb default '[]'::jsonb, -- Array of {speaker, text, timestamp}
  mind_map_data jsonb default '{}'::jsonb, -- React Flow {nodes, edges}
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable Row Level Security (RLS) - Optional for MVP but good practice
alter table public.subordinates enable row level security;
alter table public.sessions enable row level security;

-- Allow anon access for MVP (Simpler for prototype, secure later with Auth)
create policy "Allow public read/write access" on public.subordinates for all using (true);
create policy "Allow public read/write access" on public.sessions for all using (true);
