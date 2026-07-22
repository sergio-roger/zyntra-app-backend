-- ============================================================
-- UP: agent_categories — catálogo de categorías para agrupar los System
-- Agents en tabs horizontales (menú Agentes IA / Store). Vive en un
-- schema propio `marketing` (no en `workflows`, que por decisión explícita
-- en 20260721_realign_module_schemas.sql se mantiene consolidado para
-- agents/forms/orchestrator) — refleja el nombre real del feature
-- (frontend/src/features/marketing).
-- ============================================================

CREATE SCHEMA IF NOT EXISTS marketing;

CREATE TABLE IF NOT EXISTS marketing.agent_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       VARCHAR NOT NULL UNIQUE,
  name       VARCHAR NOT NULL,
  color      VARCHAR NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO marketing.agent_categories (slug, name, color, sort_order) VALUES
  ('estrategia', 'Estrategia', '#7c3aed', 1),
  ('contenido', 'Contenido', '#16a34a', 2),
  ('seo', 'SEO', '#d97706', 3),
  ('social-media', 'Social Media', '#db2777', 4),
  ('crm', 'CRM', '#0d9488', 5),
  ('analitica', 'Analítica', '#2563eb', 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- DOWN (rollback, run manually if needed):
-- DROP TABLE IF EXISTS marketing.agent_categories;
-- DROP SCHEMA IF EXISTS marketing;
-- ============================================================
