-- ============================================================
-- UP: trazabilidad de creación por agente de IA en contacts/tasks
-- (Tool Registry: createLead / createTask, System Agents).
-- ============================================================

ALTER TYPE crm.contacts_source_enum ADD VALUE IF NOT EXISTS 'agent';

ALTER TABLE crm.tasks
  ADD COLUMN IF NOT EXISTS created_by_agent_id UUID NULL;

-- ============================================================
-- DOWN (rollback, run manually if needed):
-- ALTER TABLE crm.tasks DROP COLUMN IF EXISTS created_by_agent_id;
-- (Postgres no soporta DROP VALUE de un enum sin recrear el tipo — no hay
-- rollback simple para el valor 'agent' de contacts_source_enum.)
-- ============================================================
