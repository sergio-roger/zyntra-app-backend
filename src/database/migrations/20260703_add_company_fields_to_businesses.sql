-- Migration: Add company profile fields to public.businesses
-- Supports the "Mi empresa" admin-only view/update feature
-- Dev: TypeORM synchronize:true auto-adds these columns. Run manually in production.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS email     VARCHAR,
  ADD COLUMN IF NOT EXISTS phone     VARCHAR,
  ADD COLUMN IF NOT EXISTS address   VARCHAR,
  ADD COLUMN IF NOT EXISTS tax_id    VARCHAR,
  ADD COLUMN IF NOT EXISTS website   VARCHAR,
  ADD COLUMN IF NOT EXISTS logo_url  VARCHAR;
