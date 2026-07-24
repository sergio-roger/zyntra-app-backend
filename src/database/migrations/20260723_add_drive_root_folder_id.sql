-- Migration: Add driveRootFolderId to security.businesses and security.users
-- Puntero logico (no FK real) al folder raiz en storage-service (otra base de datos).
-- Se crea perezosamente: drive.service.ts la completa la primera vez que el owner entra a Drive.
-- Dev: TypeORM synchronize:true auto-agrega estas columnas. Ejecutar manualmente en produccion.

ALTER TABLE security.businesses ADD COLUMN IF NOT EXISTS drive_root_folder_id UUID;
ALTER TABLE security.users ADD COLUMN IF NOT EXISTS drive_root_folder_id UUID;
