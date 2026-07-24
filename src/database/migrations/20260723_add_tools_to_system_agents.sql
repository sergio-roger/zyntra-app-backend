-- ============================================================
-- UP: tools para System Agents — catálogo global, no editable por el
-- usuario final (a diferencia de workflows.agents.tools). Mismo storage que
-- Agent.tools (TypeORM simple-array -> TEXT, valores separados por coma).
-- ============================================================

ALTER TABLE workflows.system_agents
  ADD COLUMN IF NOT EXISTS tools TEXT NOT NULL DEFAULT '';

UPDATE workflows.system_agents
SET tools = 'web_search'
WHERE slug = 'marketing-strategist';

-- ============================================================
-- DOWN (rollback, run manually if needed):
-- ALTER TABLE workflows.system_agents DROP COLUMN IF EXISTS tools;
-- ============================================================
