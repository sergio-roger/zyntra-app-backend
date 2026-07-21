-- ============================================================
-- UP: workflow_runs — estado de ejecución del Orchestrator (Fase A).
-- Vive en el schema workflows, igual que agents/knowledge_documents desde
-- 20260720_move_agents_to_workflows_schema.sql.
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_runs_status_enum') THEN
    CREATE TYPE workflow_runs_status_enum AS ENUM ('pending', 'running', 'completed', 'failed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS workflows.workflow_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  goal          TEXT NOT NULL,
  status        workflow_runs_status_enum NOT NULL DEFAULT 'pending',
  steps         JSONB NOT NULL DEFAULT '[]',
  error_message TEXT NULL,
  started_at    TIMESTAMPTZ NULL,
  finished_at   TIMESTAMPTZ NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_business_id ON workflows.workflow_runs (business_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status      ON workflows.workflow_runs (status);

-- ============================================================
-- DOWN (rollback, run manually if needed):
-- DROP TABLE IF EXISTS workflows.workflow_runs;
-- DROP TYPE  IF EXISTS workflow_runs_status_enum;
-- ============================================================
