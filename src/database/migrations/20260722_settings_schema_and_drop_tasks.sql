-- ============================================================
-- UP: rename `lifecycle` schema to `settings` (Settings feature owns
-- the "Ciclo de vida" sub-page), and fold `tasks` into `workflows`
-- (AgentTask is agent-run bookkeeping, same domain as WorkflowRun).
-- ============================================================
-- Dev: TypeORM synchronize:true expects these tables already moved
-- once lifecycle-*.entity.ts / agent-task.entity.ts declare their new
-- schema — run this BEFORE starting the backend against an existing
-- dev database, so synchronize doesn't create empty duplicates.

ALTER SCHEMA lifecycle RENAME TO settings;

ALTER TYPE tasks.agent_tasks_type_enum SET SCHEMA workflows;
ALTER TYPE tasks.agent_tasks_status_enum SET SCHEMA workflows;
ALTER TABLE tasks.agent_tasks SET SCHEMA workflows;
DROP SCHEMA IF EXISTS tasks;

-- ============================================================
-- DOWN (rollback, run manually if needed):
-- CREATE SCHEMA IF NOT EXISTS tasks;
-- ALTER TABLE workflows.agent_tasks SET SCHEMA tasks;
-- ALTER TYPE workflows.agent_tasks_type_enum SET SCHEMA tasks;
-- ALTER TYPE workflows.agent_tasks_status_enum SET SCHEMA tasks;
--
-- ALTER SCHEMA settings RENAME TO lifecycle;
-- ============================================================
