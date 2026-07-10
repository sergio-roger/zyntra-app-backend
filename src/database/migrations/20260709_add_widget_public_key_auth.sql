-- ============================================================
-- UP: public_key exchange support for the widget auth flow
-- ============================================================
-- Adds the columns needed to swap plaintext business_id/channel_id in
-- widget requests for a public_key -> short-lived JWT exchange. See the
-- widget-session JWT work (next step) for how these are consumed.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS public_key VARCHAR(32),
  ADD COLUMN IF NOT EXISTS allowed_origins TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS public_key_revoked_at TIMESTAMPTZ;

-- Uniqueness only among *active* keys (public_key_revoked_at IS NULL), not a
-- plain UNIQUE column constraint — a revoked key's value is intentionally
-- allowed to collide with nothing else being active, matching the rotation
-- flow (rotate = issue new key, revoke old one, keep the old row for
-- traceability instead of deleting it).
CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_public_key
  ON public.channels (public_key)
  WHERE public_key_revoked_at IS NULL;

COMMENT ON COLUMN public.channels.public_key IS
  'Public, non-secret identifier embedded in the widget snippet (wpk_ + 21 url-safe chars). Exchanged by the widget for a short-lived session JWT; replaces sending business_id/channel_id in plaintext. NULL for non-web_chat channels.';

COMMENT ON COLUMN public.channels.allowed_origins IS
  'Domains allowed to perform the public_key -> JWT exchange for this channel. Empty array = no restriction (dev/testing use only; the exchange endpoint must log a warning when it allows an empty-list channel through).';

COMMENT ON COLUMN public.channels.public_key_revoked_at IS
  'Set to revoke a public_key without deleting the row (key rotation). A revoked key must be rejected by the exchange endpoint with the same generic error as "not found", to avoid leaking whether a key ever existed.';

-- Backfill: every existing web_chat channel gets a public_key. Uses
-- gen_random_bytes (volatile -> evaluated per row, so each row gets an
-- independent random value even in this bulk UPDATE).
UPDATE public.channels c
SET public_key = 'wpk_' || substr(
  translate(encode(gen_random_bytes(16), 'base64'), '+/=', '-_x'),
  1, 21
)
FROM public.channel_types ct
WHERE c.channel_type_id = ct.id
  AND ct.key = 'web_chat'
  AND c.public_key IS NULL;

-- ============================================================
-- DOWN: Drop columns/index (run manually if rollback needed)
-- ============================================================
-- DROP INDEX IF EXISTS idx_channels_public_key;
-- ALTER TABLE public.channels
--   DROP COLUMN IF EXISTS public_key,
--   DROP COLUMN IF EXISTS allowed_origins,
--   DROP COLUMN IF EXISTS public_key_revoked_at;
