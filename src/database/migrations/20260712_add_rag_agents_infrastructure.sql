-- ============================================================
-- UP: RAG infrastructure base schema (agents config, plan limits,
--     knowledge_documents table). No business logic yet — see Fase B.
-- ============================================================

-- 1. agents: identity/voice/memory/knowledge configuration --------------
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS tone VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS locale VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS max_tokens INTEGER NOT NULL DEFAULT 1024,
  ADD COLUMN IF NOT EXISTS knowledge_collection VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS voice_config JSONB NULL,
  ADD COLUMN IF NOT EXISTS memory_config JSONB NULL;

-- 2. plans: knowledge-base limits ----------------------------------------
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS kb_max_documents_per_agent INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kb_max_file_size_mb INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kb_max_storage_mb_per_business INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kb_monthly_upload_limit INTEGER NOT NULL DEFAULT 0;

-- 3. knowledge_documents ---------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'knowledge_documents_status_enum') THEN
    CREATE TYPE knowledge_documents_status_enum AS ENUM ('pending', 'processing', 'ready', 'failed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  agent_id          UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  file_name         VARCHAR NOT NULL,
  file_type         VARCHAR NOT NULL,
  file_size_bytes   BIGINT NOT NULL,
  -- Nullable: the row is created in 'pending' status BEFORE calling the
  -- storage microservice, so we have our own id to use as entityId for
  -- POST /storage/upload. storage_file_id is filled in once that call returns.
  storage_file_id   UUID NULL,
  status            knowledge_documents_status_enum NOT NULL DEFAULT 'pending',
  error_message     TEXT NULL,
  chunk_count       INTEGER NOT NULL DEFAULT 0,
  token_count       INTEGER NOT NULL DEFAULT 0,
  uploaded_by       UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at      TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_business_id ON public.knowledge_documents (business_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_agent_id    ON public.knowledge_documents (agent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_status      ON public.knowledge_documents (status);

-- ============================================================
-- DOWN: Drop in reverse order (run manually if rollback needed)
-- ============================================================
-- DROP TABLE IF EXISTS public.knowledge_documents;
-- DROP TYPE  IF EXISTS knowledge_documents_status_enum;
-- ALTER TABLE public.plans
--   DROP COLUMN IF EXISTS kb_max_documents_per_agent,
--   DROP COLUMN IF EXISTS kb_max_file_size_mb,
--   DROP COLUMN IF EXISTS kb_max_storage_mb_per_business,
--   DROP COLUMN IF EXISTS kb_monthly_upload_limit;
-- ALTER TABLE public.agents
--   DROP COLUMN IF EXISTS tone,
--   DROP COLUMN IF EXISTS locale,
--   DROP COLUMN IF EXISTS max_tokens,
--   DROP COLUMN IF EXISTS knowledge_collection,
--   DROP COLUMN IF EXISTS voice_config,
--   DROP COLUMN IF EXISTS memory_config;
