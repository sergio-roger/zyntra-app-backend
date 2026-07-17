-- ==============================================================================
-- UP: Default new agents to a free OpenRouter model instead of a paid one
-- Dev: TypeORM synchronize:true auto-alters this. Run manually in production.
-- ==============================================================================
ALTER TABLE public.agents ALTER COLUMN model SET DEFAULT 'openai/gpt-oss-20b:free';
