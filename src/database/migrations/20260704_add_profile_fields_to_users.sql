-- Migration: Add phone and bio fields to security.users
-- Supports extended personal profile fields in "Mi Cuenta" > Perfil
-- Dev: TypeORM synchronize:true auto-adds these columns. Run manually in production.

ALTER TABLE security.users
  ADD COLUMN IF NOT EXISTS phone VARCHAR,
  ADD COLUMN IF NOT EXISTS bio   VARCHAR(280);
