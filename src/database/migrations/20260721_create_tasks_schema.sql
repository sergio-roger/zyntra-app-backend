-- ============================================================
-- UP: dedicated `tasks` schema for AgentTask, migrating it off
-- MongoDB (mongo's `agent_tasks` collection) onto Postgres.
-- ============================================================
-- No data migration: MONGO_URI in every known environment points at a
-- local-only Mongo instance (dev convenience), so there is no
-- production/shared data behind it to carry over.
--
-- Superseded by 20260722_settings_schema_and_drop_tasks.sql, which
-- folds this table into `workflows` and drops the `tasks` schema. This
-- migration is guarded to no-op once that has happened — run-migrations.ts
-- replays the full ordered history every time, so a plain `CREATE TABLE
-- IF NOT EXISTS tasks.agent_tasks` would otherwise resurrect an empty
-- duplicate after the table moved out from under it.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'workflows' AND table_name = 'agent_tasks'
  ) THEN
    RETURN;
  END IF;

  EXECUTE 'CREATE SCHEMA IF NOT EXISTS tasks';

  BEGIN
    EXECUTE $ddl$CREATE TYPE tasks.agent_tasks_type_enum AS ENUM (
      'content', 'social', 'chatbot', 'crm_analysis', 'report'
    )$ddl$;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    EXECUTE $ddl$CREATE TYPE tasks.agent_tasks_status_enum AS ENUM (
      'pending', 'running', 'completed', 'failed'
    )$ddl$;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  EXECUTE $ddl$
    CREATE TABLE IF NOT EXISTS tasks.agent_tasks (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id   UUID NOT NULL REFERENCES security.businesses(id) ON DELETE CASCADE,
      type          tasks.agent_tasks_type_enum NOT NULL,
      status        tasks.agent_tasks_status_enum NOT NULL DEFAULT 'pending',
      input         JSONB,
      output        JSONB,
      error         TEXT,
      started_at    TIMESTAMPTZ,
      completed_at  TIMESTAMPTZ,
      tokens_used   INT,
      duration_ms   INT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  $ddl$;

  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_agent_tasks_business_created ON tasks.agent_tasks (business_id, created_at)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON tasks.agent_tasks (status)';
END $$;

-- ============================================================
-- DOWN (rollback, run manually if needed):
-- DROP TABLE IF EXISTS tasks.agent_tasks;
-- DROP TYPE IF EXISTS tasks.agent_tasks_status_enum;
-- DROP TYPE IF EXISTS tasks.agent_tasks_type_enum;
-- DROP SCHEMA IF EXISTS tasks;
-- ============================================================
