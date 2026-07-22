-- ============================================================
-- UP: fold `channels` schema into `settings` — channel management
-- (Settings > Canales / Mis Canales) lives there per current call.
-- ============================================================
-- Dev: TypeORM synchronize:true expects these tables already moved
-- once channel*.entity.ts declare schema: 'settings' — run this BEFORE
-- starting the backend against an existing dev database, so synchronize
-- doesn't create empty duplicates.
--
-- Guarded so replaying the full migration history (run-migrations.ts
-- always runs the whole ordered list) is a no-op once applied.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'channels') THEN
    EXECUTE 'ALTER TYPE channels.channels_status_enum SET SCHEMA settings';
    EXECUTE 'ALTER TABLE channels.channels SET SCHEMA settings';
    EXECUTE 'ALTER TABLE channels.channel_credentials SET SCHEMA settings';
    EXECUTE 'ALTER TABLE channels.channel_types SET SCHEMA settings';
    EXECUTE 'DROP SCHEMA IF EXISTS channels';
  END IF;
END $$;

-- ============================================================
-- DOWN (rollback, run manually if needed):
-- CREATE SCHEMA IF NOT EXISTS channels;
-- ALTER TABLE settings.channel_types SET SCHEMA channels;
-- ALTER TABLE settings.channel_credentials SET SCHEMA channels;
-- ALTER TABLE settings.channels SET SCHEMA channels;
-- ALTER TYPE settings.channels_status_enum SET SCHEMA channels;
-- ============================================================
