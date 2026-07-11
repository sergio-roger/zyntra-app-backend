-- ============================================================
-- UP: blocklist + "allow insecure domains" override for the widget
--     origin check (extends the allowed_origins allowlist added in
--     20260709_add_widget_public_key_auth.sql)
-- ============================================================

ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS blocked_origins TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allow_insecure_origins BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.channels.blocked_origins IS
  'Domains explicitly denied from the public_key -> JWT exchange, checked before allowed_origins. Ignored entirely when allow_insecure_origins is true.';

COMMENT ON COLUMN public.channels.allow_insecure_origins IS
  'When true, bypasses both allowed_origins and blocked_origins and permits the public_key -> JWT exchange from any origin. Opt-in escape hatch (dev/testing); the exchange endpoint logs a warning whenever it is used.';

-- Refresh web_chat's config_schema so the wizard's new blockedDomains /
-- allowInsecureDomains fields are documented for existing installations too.
-- jsonb_set (not `||`) so the merge happens inside "properties" instead of
-- replacing it wholesale and dropping position/theme/primaryColor/etc.
UPDATE public.channel_types
SET config_schema = jsonb_set(
  config_schema,
  '{properties}',
  (config_schema->'properties') || '{
    "blockedDomains": {"type":"array","items":{"type":"string"}},
    "allowInsecureDomains": {"type":"boolean","default":false}
  }'::jsonb
)
WHERE key = 'web_chat';

-- ============================================================
-- DOWN: Drop columns (run manually if rollback needed)
-- ============================================================
-- ALTER TABLE public.channels
--   DROP COLUMN IF EXISTS blocked_origins,
--   DROP COLUMN IF EXISTS allow_insecure_origins;
