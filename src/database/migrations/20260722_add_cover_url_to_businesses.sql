-- Migration: Add coverUrl to security.businesses
-- Supports the Facebook-style cover banner on "Mi empresa"
-- Dev: TypeORM synchronize:true auto-adds this column. Run manually in production.

ALTER TABLE security.businesses ADD COLUMN IF NOT EXISTS cover_url VARCHAR;
