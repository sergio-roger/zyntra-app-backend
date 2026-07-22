-- ============================================================
-- UP: agrega categoría (FK cross-schema a marketing.agent_categories,
-- igual patrón que las FKs cross-schema que quedaron tras
-- 20260721_realign_module_schemas.sql) y columnas de stats a
-- workflows.system_agents. Las stats quedan en 0 hasta que exista
-- lógica real de tracking (deuda anotada, ver comentario en
-- system-agents.service.ts).
-- ============================================================

ALTER TABLE workflows.system_agents
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES marketing.agent_categories(id),
  ADD COLUMN IF NOT EXISTS tasks_done_today INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tasks_total_today INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS efficiency INT NOT NULL DEFAULT 0;

UPDATE workflows.system_agents sa
SET category_id = c.id
FROM marketing.agent_categories c
WHERE c.slug = CASE sa.slug
  WHEN 'marketing-strategist'   THEN 'estrategia'
  WHEN 'content-creator'        THEN 'contenido'
  WHEN 'multimedia-designer'    THEN 'contenido'
  WHEN 'seo-specialist'         THEN 'seo'
  WHEN 'social-media-manager'   THEN 'social-media'
  WHEN 'crm-agent'              THEN 'crm'
  WHEN 'automation-agent'       THEN 'analitica'
  WHEN 'data-analyst'           THEN 'analitica'
END;

-- ============================================================
-- DOWN (rollback, run manually if needed):
-- ALTER TABLE workflows.system_agents
--   DROP COLUMN IF EXISTS efficiency,
--   DROP COLUMN IF EXISTS tasks_total_today,
--   DROP COLUMN IF EXISTS tasks_done_today,
--   DROP COLUMN IF EXISTS category_id;
-- ============================================================
