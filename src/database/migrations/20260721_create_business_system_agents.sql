-- ============================================================
-- UP: business_system_agents — registro de qué System Agents importó
-- cada negocio a su "Equipo de Agentes" (menú Agentes IA / Team).
-- FK a security.businesses porque businesses ya migró de public a
-- security en 20260721_realign_module_schemas.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS marketing.business_system_agents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES security.businesses(id) ON DELETE CASCADE,
  system_agent_id UUID NOT NULL REFERENCES workflows.system_agents(id) ON DELETE CASCADE,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_business_system_agent UNIQUE (business_id, system_agent_id)
);

-- ============================================================
-- DOWN (rollback, run manually if needed):
-- DROP TABLE IF EXISTS marketing.business_system_agents;
-- ============================================================
