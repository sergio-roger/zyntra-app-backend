-- Migration: Create security.settings table
-- Business-scoped key/value settings (e.g. inbox_sound_enabled).
-- Mirrors security.user_preferences but scoped by business instead of user.
-- Dev: TypeORM synchronize:true auto-creates this. Run manually in production.

CREATE TABLE IF NOT EXISTS security.settings (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID          NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  key         VARCHAR(100)  NOT NULL,
  value       JSONB         NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_settings_business_key UNIQUE (business_id, key)
);

CREATE INDEX IF NOT EXISTS idx_settings_business_id
  ON security.settings(business_id);
