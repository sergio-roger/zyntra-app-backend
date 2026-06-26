-- Migration: Add owner_id to crm.contacts
-- Run this in production (dev uses synchronize: true and auto-applies the change)

ALTER TABLE crm.contacts
  ADD COLUMN IF NOT EXISTS owner_id UUID NULL;

ALTER TABLE crm.contacts
  ADD CONSTRAINT IF NOT EXISTS fk_contacts_owner
  FOREIGN KEY (owner_id)
  REFERENCES security.users(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_owner_id
  ON crm.contacts(owner_id);
