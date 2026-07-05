-- Migration: 20260626_drop_company_name_from_contacts
-- Removes the legacy company_name string field now replaced by company_id FK

ALTER TABLE crm.contacts
  DROP COLUMN IF EXISTS company_name;
