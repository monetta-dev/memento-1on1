-- Add agenda_items and notes columns to sessions table for face-to-face mode

-- Add agenda_items column (JSONB array of agenda items)
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS agenda_items JSONB DEFAULT '[]'::jsonb;

-- Add notes column (JSONB array of notes)
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS notes JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.sessions.agenda_items IS 'Array of agenda items for face-to-face sessions. Each item has id, text, completed fields.';
COMMENT ON COLUMN public.sessions.notes IS 'Array of notes taken during session. Each note has id, content, timestamp, source fields.';