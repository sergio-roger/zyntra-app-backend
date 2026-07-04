-- Migration: Update security.users schema for first_name, last_name, job_title, avatar_url, status enum, and activation fields

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status_enum') THEN
        CREATE TYPE security.user_status_enum AS ENUM ('active', 'inactive', 'suspended');
    END IF;
END $$;

ALTER TABLE security.users ADD COLUMN IF NOT EXISTS first_name VARCHAR;
ALTER TABLE security.users ADD COLUMN IF NOT EXISTS last_name VARCHAR;
ALTER TABLE security.users ADD COLUMN IF NOT EXISTS job_title VARCHAR;
ALTER TABLE security.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE security.users ADD COLUMN IF NOT EXISTS status security.user_status_enum DEFAULT 'active';
ALTER TABLE security.users ADD COLUMN IF NOT EXISTS is_account_activated BOOLEAN DEFAULT false;
ALTER TABLE security.users ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- Data migration: populate first_name and last_name from name where missing
UPDATE security.users
SET 
  first_name = COALESCE(first_name, SPLIT_PART(name, ' ', 1)),
  last_name = COALESCE(last_name, NULLIF(SUBSTRING(name FROM POSITION(' ' IN name) + 1), ''))
WHERE first_name IS NULL OR last_name IS NULL;

-- Fallback for last_name if empty
UPDATE security.users
SET last_name = ''
WHERE last_name IS NULL;

-- Migrate is_active boolean to status enum using dynamic type casting
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT udt_name INTO col_type 
  FROM information_schema.columns 
  WHERE table_schema = 'security' AND table_name = 'users' AND column_name = 'status';
  
  IF col_type = 'users_status_enum' THEN
    UPDATE security.users
    SET status = CASE WHEN is_active = true THEN 'active'::security.users_status_enum ELSE 'inactive'::security.users_status_enum END
    WHERE status IS NULL;
  ELSE
    UPDATE security.users
    SET status = CASE WHEN is_active = true THEN 'active'::security.user_status_enum ELSE 'inactive'::security.user_status_enum END
    WHERE status IS NULL;
  END IF;
END $$;
