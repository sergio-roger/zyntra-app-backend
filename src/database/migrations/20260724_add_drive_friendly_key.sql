-- Migration: Add driveFriendlyKey to security.businesses and security.users
-- Slug legible (nombre de la empresa / empresa+usuario) usado como referencia amigable
-- de esa empresa o usuario en R2. No reemplaza drive_root_folder_id, que sigue siendo
-- el id real de la carpeta raiz en storage-service.
-- Dev: TypeORM synchronize:true auto-agrega estas columnas. Ejecutar manualmente en produccion.

ALTER TABLE security.businesses ADD COLUMN IF NOT EXISTS drive_friendly_key VARCHAR;
ALTER TABLE security.users ADD COLUMN IF NOT EXISTS drive_friendly_key VARCHAR;
