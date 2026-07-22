-- ============================================================
-- UP: align each backend module with its own Postgres schema,
-- matching the frontend feature rename (agents/automations/chatbot
-- -> marketing/workflows/inbox).
-- ============================================================
-- - channels module: public -> channels
-- - lifecycle module: public -> lifecycle
-- - chatbot module (-> Inbox feature): messaging -> inbox, and
--   security.settings (business-scoped inbox settings, e.g.
--   inbox_sound_enabled) moves in too — it always belonged to this
--   module, it was just parked under security by mistake.
-- - auth module: businesses/plans/plan_descriptions/plan_modules move
--   from public into security, joining users/roles/menus/permissions —
--   per explicit decision, auth stays a single schema instead of
--   public/security split.
-- - crm.teams and the agents/forms/orchestrator "workflows" schema stay
--   as-is (deliberately shared/consolidated, confirmed to not split).
--
-- Cross-schema FKs (e.g. inbox.conversations -> channels.channels,
-- channels.channels -> security.businesses) keep working untouched:
-- Postgres FK constraints track table OIDs, not schema names.
--
-- Dev: TypeORM synchronize:true expects these tables already in their
-- new schema once the entity decorators declare it — run this BEFORE
-- starting the backend against an existing dev database, so synchronize
-- doesn't create empty duplicates.

CREATE SCHEMA IF NOT EXISTS channels;
CREATE SCHEMA IF NOT EXISTS lifecycle;

ALTER TABLE public.channels SET SCHEMA channels;
ALTER TABLE public.channel_credentials SET SCHEMA channels;
ALTER TABLE public.channel_types SET SCHEMA channels;

ALTER TABLE public.lifecycle_history SET SCHEMA lifecycle;
ALTER TABLE public.lifecycle_stages SET SCHEMA lifecycle;

ALTER SCHEMA messaging RENAME TO inbox;
ALTER TABLE security.settings SET SCHEMA inbox;

ALTER TABLE public.businesses SET SCHEMA security;
ALTER TABLE public.plans SET SCHEMA security;
ALTER TABLE public.plan_descriptions SET SCHEMA security;
ALTER TABLE public.plan_modules SET SCHEMA security;

-- ============================================================
-- DOWN (rollback, run manually if needed):
-- ALTER TABLE security.plan_modules SET SCHEMA public;
-- ALTER TABLE security.plan_descriptions SET SCHEMA public;
-- ALTER TABLE security.plans SET SCHEMA public;
-- ALTER TABLE security.businesses SET SCHEMA public;
--
-- ALTER TABLE inbox.settings SET SCHEMA security;
-- ALTER SCHEMA inbox RENAME TO messaging;
--
-- ALTER TABLE lifecycle.lifecycle_stages SET SCHEMA public;
-- ALTER TABLE lifecycle.lifecycle_history SET SCHEMA public;
-- DROP SCHEMA IF EXISTS lifecycle;
--
-- ALTER TABLE channels.channel_types SET SCHEMA public;
-- ALTER TABLE channels.channel_credentials SET SCHEMA public;
-- ALTER TABLE channels.channels SET SCHEMA public;
-- DROP SCHEMA IF EXISTS channels;
-- ============================================================
