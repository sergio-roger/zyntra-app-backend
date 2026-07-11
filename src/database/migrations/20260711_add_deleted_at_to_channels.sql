-- ============================================================
-- UP: Add deleted_at column to public.channels for soft delete
-- ============================================================
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
