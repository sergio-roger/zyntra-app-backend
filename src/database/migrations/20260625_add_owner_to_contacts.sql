-- Migration: Add owner_id to crm.contacts
-- Run this in production (dev uses synchronize: true and auto-applies the change)

ALTER TABLE crm.contacts
  ADD COLUMN IF NOT EXISTS owner_id UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'crm' AND constraint_name = 'fk_contacts_owner'
  ) THEN
    ALTER TABLE crm.contacts
      ADD CONSTRAINT fk_contacts_owner
      FOREIGN KEY (owner_id)
      REFERENCES security.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contacts_owner_id
  ON crm.contacts(owner_id);
