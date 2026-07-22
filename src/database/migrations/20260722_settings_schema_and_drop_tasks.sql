-- ============================================================
-- UP: rename `lifecycle` schema to `settings` (Settings feature owns
-- the "Ciclo de vida" sub-page), and fold `tasks` into `workflows`
-- (AgentTask is agent-run bookkeeping, same domain as WorkflowRun).
-- ============================================================
-- Dev: TypeORM synchronize:true expects these tables already moved
-- once lifecycle-*.entity.ts / agent-task.entity.ts declare their new
-- schema — run this BEFORE starting the backend against an existing
-- dev database, so synchronize doesn't create empty duplicates.
--
-- Guarded on both steps so replaying the full migration history
-- (run-migrations.ts always runs the whole ordered list) is a no-op
-- once applied, instead of erroring on an already-renamed schema.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'lifecycle') THEN
    EXECUTE 'ALTER SCHEMA lifecycle RENAME TO settings';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'tasks') THEN
    EXECUTE 'ALTER TYPE tasks.agent_tasks_type_enum SET SCHEMA workflows';
    EXECUTE 'ALTER TYPE tasks.agent_tasks_status_enum SET SCHEMA workflows';
    EXECUTE 'ALTER TABLE tasks.agent_tasks SET SCHEMA workflows';
    EXECUTE 'DROP SCHEMA IF EXISTS tasks';
  END IF;
END $$;

-- ============================================================
-- DOWN (rollback, run manually if needed):
-- CREATE SCHEMA IF NOT EXISTS tasks;
-- ALTER TABLE workflows.agent_tasks SET SCHEMA tasks;
-- ALTER TYPE workflows.agent_tasks_type_enum SET SCHEMA tasks;
-- ALTER TYPE workflows.agent_tasks_status_enum SET SCHEMA tasks;
--
-- ALTER SCHEMA settings RENAME TO lifecycle;
-- ============================================================
