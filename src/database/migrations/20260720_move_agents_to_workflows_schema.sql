-- ============================================================
-- UP: move `agents` and `knowledge_documents` from `public` to a
-- dedicated `workflows` schema (Automatizaciones domain).
-- ============================================================
-- No real FK constraint crosses into these tables from other schemas —
-- channels.agent_id is a plain UUID column by design (see comment in
-- channel.entity.ts), resolved in application code via AgentsService, not
-- via a Postgres FK. The only real FK is knowledge_documents.agent_id ->
-- agents.id, internal to this schema move, so it survives untouched.
--
-- Dev: TypeORM synchronize:true expects these tables already in
-- `workflows` once agent.entity.ts / knowledge-document.entity.ts declare
-- schema: 'workflows' — run this BEFORE starting the backend against an
-- existing dev database, so synchronize doesn't create empty duplicates.

CREATE SCHEMA IF NOT EXISTS workflows;

ALTER TABLE public.agents SET SCHEMA workflows;
ALTER TABLE public.knowledge_documents SET SCHEMA workflows;

-- ============================================================
-- DOWN (rollback, run manually if needed):
-- ALTER TABLE workflows.knowledge_documents SET SCHEMA public;
-- ALTER TABLE workflows.agents SET SCHEMA public;
-- ============================================================
