-- ============================================================
-- UP: dedicated `tasks` schema for AgentTask, migrating it off
-- MongoDB (mongo's `agent_tasks` collection) onto Postgres.
-- ============================================================
-- No data migration: MONGO_URI in every known environment points at a
-- local-only Mongo instance (dev convenience), so there is no
-- production/shared data behind it to carry over.
--
-- Dev: TypeORM synchronize:true expects this table already in `tasks`
-- once agent-task.entity.ts declares schema: 'tasks' — run this BEFORE
-- starting the backend against an existing dev database, so synchronize
-- doesn't create it out of band.

CREATE SCHEMA IF NOT EXISTS tasks;

DO $$ BEGIN
  CREATE TYPE tasks.agent_tasks_type_enum AS ENUM (
    'content', 'social', 'chatbot', 'crm_analysis', 'report'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tasks.agent_tasks_status_enum AS ENUM (
    'pending', 'running', 'completed', 'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_business_created
  ON tasks.agent_tasks (business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status
  ON tasks.agent_tasks (status);

-- ============================================================
-- DOWN (rollback, run manually if needed):
-- DROP TABLE IF EXISTS tasks.agent_tasks;
-- DROP TYPE IF EXISTS tasks.agent_tasks_status_enum;
-- DROP TYPE IF EXISTS tasks.agent_tasks_type_enum;
-- DROP SCHEMA IF EXISTS tasks;
-- ============================================================
