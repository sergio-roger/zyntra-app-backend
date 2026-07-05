-- Migration: Create security.user_preferences table
-- Supports per-user key-value preferences (e.g. contacts_table_columns)
-- Dev: TypeORM synchronize:true auto-creates this. Run manually in production.

-- user_id holds either a crm_user id (security.users) or a business id (security.businesses),
-- so no FK constraint is used here.
CREATE TABLE IF NOT EXISTS security.user_preferences (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL,
  key         VARCHAR(100)  NOT NULL,
  value       JSONB         NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_preferences_user_key UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
  ON security.user_preferences(user_id);
