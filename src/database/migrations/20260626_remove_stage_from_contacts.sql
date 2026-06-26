-- Migration: Remove stage from crm.contacts
-- Run this in production (dev uses synchronize: true and auto-applies the change)

ALTER TABLE crm.contacts
  DROP COLUMN IF EXISTS stage;
