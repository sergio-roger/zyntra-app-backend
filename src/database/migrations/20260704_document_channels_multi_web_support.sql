-- ============================================================
-- UP: Document + index support for N web_chat channels per business
-- ============================================================
-- The schema already allows multiple channels of the same channel_type per
-- business: uq_channel_per_business_type_name (see 20260701_create_channels.sql)
-- is UNIQUE(business_id, channel_type_id, name), not UNIQUE(business_id,
-- channel_type_id) — so several "web_chat" rows can coexist for one business
-- as long as their name differs. The public identifier for a specific
-- channel is channels.id (channel_id), independent of business_id.
--
-- This migration adds a supporting index for "all web channels of a
-- business" queries and documents the design via column/constraint comments.
-- No column or constraint is added or removed; existing rows are unaffected.

CREATE INDEX IF NOT EXISTS idx_channels_business_type
  ON public.channels (business_id, channel_type_id);

COMMENT ON CONSTRAINT uq_channel_per_business_type_name ON public.channels IS
  'Permite multiples canales del mismo tipo (ej. varios web_chat) por business, diferenciados por name. El identificador publico usado por los endpoints del widget es channel_id (channels.id), no business_id.';

COMMENT ON COLUMN public.channels.name IS
  'Nombre descriptivo elegido por el usuario para distinguir canales del mismo tipo bajo el mismo business (ej. "Sitio principal", "Landing campana verano").';

COMMENT ON COLUMN public.channels.status IS
  'Soft-disable: status = inactive desactiva el canal sin eliminar la fila, preservando referencias externas a channel_id (ej. conversations.channel_id en MongoDB).';

-- ============================================================
-- DOWN: Drop index / clear comments (run manually if rollback needed)
-- ============================================================
-- DROP INDEX IF EXISTS idx_channels_business_type;
-- COMMENT ON CONSTRAINT uq_channel_per_business_type_name ON public.channels IS NULL;
-- COMMENT ON COLUMN public.channels.name IS NULL;
-- COMMENT ON COLUMN public.channels.status IS NULL;
