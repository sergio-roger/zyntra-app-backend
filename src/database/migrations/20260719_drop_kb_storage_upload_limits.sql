-- ============================================================
-- UP: drop unused KB storage/upload plan limits — replaced by a
-- flat kb_max_documents_per_agent / kb_max_file_size_mb pair,
-- same for every plan (see plans.data.ts).
-- ============================================================
ALTER TABLE public.plans
  DROP COLUMN IF EXISTS kb_max_storage_mb_per_business,
  DROP COLUMN IF EXISTS kb_monthly_upload_limit;

-- ============================================================
-- DOWN: (run manually if rollback needed)
-- ============================================================
-- ALTER TABLE public.plans
--   ADD COLUMN IF NOT EXISTS kb_max_storage_mb_per_business INTEGER NOT NULL DEFAULT 0,
--   ADD COLUMN IF NOT EXISTS kb_monthly_upload_limit INTEGER NOT NULL DEFAULT 0;
