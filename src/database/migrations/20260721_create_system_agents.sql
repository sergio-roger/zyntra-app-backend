-- ============================================================
-- UP: system_agents — registro de identidad de los System Agents (Fase 4
-- del plan). Tabla separada de workflows.agents a propósito: esa es para
-- User Agents (business_id NOT NULL, uno por tenant); un System Agent es
-- global, no pertenece a ningún negocio.
-- ============================================================

CREATE TABLE IF NOT EXISTS workflows.system_agents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       VARCHAR NOT NULL UNIQUE,
  name       VARCHAR NOT NULL,
  role       VARCHAR NOT NULL,
  model      VARCHAR NOT NULL DEFAULT 'gemini-flash-lite-latest',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- id fijo a propósito (no gen_random_uuid en el insert): marketing-agents
-- referencia este mismo UUID como constante en
-- src/mastra/lib/system-agents.ts — deben coincidir.
INSERT INTO workflows.system_agents (id, slug, name, role)
VALUES (
  'd2121732-8bbb-429c-b81e-b546f94f9d86',
  'marketing-strategist',
  'Marketing Strategist',
  'marketing_strategist'
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- DOWN (rollback, run manually if needed):
-- DROP TABLE IF EXISTS workflows.system_agents;
-- ============================================================
