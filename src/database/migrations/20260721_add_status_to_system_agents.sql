-- ============================================================
-- UP: catálogo completo de System Agents para el menú "Agentes IA"
-- (8 tarjetas del mockup). Solo marketing-strategist tiene un agente real
-- corriendo en marketing-agents — el resto queda en status='coming_soon'
-- hasta que se implementen.
-- ============================================================

ALTER TABLE workflows.system_agents
  ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'coming_soon',
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

UPDATE workflows.system_agents
SET status = 'active',
    description = 'Analiza tu negocio y crea planes de marketing ganadores.'
WHERE slug = 'marketing-strategist';

INSERT INTO workflows.system_agents (id, slug, name, role, description, status)
VALUES
  (gen_random_uuid(), 'content-creator', 'Creador de Contenido', 'content_creator', 'Genera contenido atractivo y optimizado para cada canal.', 'coming_soon'),
  (gen_random_uuid(), 'seo-specialist', 'Especialista SEO', 'seo_specialist', 'Optimiza tu contenido para posicionar en buscadores.', 'coming_soon'),
  (gen_random_uuid(), 'multimedia-designer', 'Diseñador Multimedia', 'multimedia_designer', 'Crea imágenes, videos y recursos visuales impactantes.', 'coming_soon'),
  (gen_random_uuid(), 'social-media-manager', 'Gestor de Redes', 'social_media_manager', 'Publica y gestiona tu presencia en redes sociales.', 'coming_soon'),
  (gen_random_uuid(), 'crm-agent', 'Agente CRM', 'crm_agent', 'Gestiona leads, contactos y oportunidades automáticamente.', 'coming_soon'),
  (gen_random_uuid(), 'automation-agent', 'Automatizador', 'automation_agent', 'Crea flujos y automatizaciones que ahorran tiempo.', 'coming_soon'),
  (gen_random_uuid(), 'data-analyst', 'Analista de Datos', 'data_analyst', 'Monitorea métricas y genera insights accionables.', 'coming_soon')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- DOWN (rollback, run manually if needed):
-- DELETE FROM workflows.system_agents WHERE slug != 'marketing-strategist';
-- ALTER TABLE workflows.system_agents DROP COLUMN IF EXISTS status;
-- ALTER TABLE workflows.system_agents DROP COLUMN IF EXISTS description;
-- ============================================================
