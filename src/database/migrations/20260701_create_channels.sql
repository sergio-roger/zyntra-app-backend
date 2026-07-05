-- ============================================================
-- UP: Create channel_types, channels, channel_credentials
-- ============================================================

-- 1. channel_types --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.channel_types (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key            VARCHAR NOT NULL UNIQUE,
  label          VARCHAR NOT NULL,
  description    TEXT,
  icon_url       VARCHAR,
  is_available   BOOLEAN NOT NULL DEFAULT false,
  config_schema  JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_channel_types_sort ON public.channel_types (sort_order);

-- 2. channels -------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel_status_enum') THEN
    CREATE TYPE channel_status_enum AS ENUM ('active', 'inactive');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.channels (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  channel_type_id  UUID NOT NULL REFERENCES public.channel_types(id) ON DELETE RESTRICT,
  name             VARCHAR NOT NULL,
  status           channel_status_enum NOT NULL DEFAULT 'active',
  agent_id         UUID,
  config           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_channel_per_business_type_name
    UNIQUE (business_id, channel_type_id, name)
);

CREATE INDEX IF NOT EXISTS idx_channels_business_id ON public.channels (business_id);
CREATE INDEX IF NOT EXISTS idx_channels_agent_id    ON public.channels (agent_id);

-- 3. channel_credentials --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.channel_credentials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  UUID NOT NULL UNIQUE REFERENCES public.channels(id) ON DELETE CASCADE,
  data        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Seed channel_types ---------------------------------------------------
INSERT INTO public.channel_types (key, label, description, is_available, config_schema, sort_order)
VALUES
  ('web_chat', 'Web Chat', 'Widget embebible para sitios web', true,
   '{
     "$schema": "http://json-schema.org/draft-07/schema#",
     "type": "object",
     "properties": {
       "position":     {"type":"string","enum":["bottom-left","bottom-right"],"default":"bottom-right"},
       "theme":        {"type":"string","enum":["light","dark","auto"],"default":"auto"},
       "primaryColor": {"type":"string","pattern":"^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$","default":"#6366f1"},
       "greeting":     {"type":"string","maxLength":500},
       "name":         {"type":"string","maxLength":100},
       "allowedDomains": {"type":"array","items":{"type":"string"}}
     },
     "additionalProperties": false
   }'::jsonb, 1),
  ('facebook', 'Facebook Messenger', 'Integración con páginas de Facebook', false,
   '{
     "$schema": "http://json-schema.org/draft-07/schema#",
     "type": "object",
     "properties": {"page_id": {"type":"string"}},
     "required": ["page_id"],
     "additionalProperties": false
   }'::jsonb, 2),
  ('telegram', 'Telegram', 'Bot de Telegram', false,
   '{
     "$schema": "http://json-schema.org/draft-07/schema#",
     "type": "object",
     "properties": {"bot_username": {"type":"string"}},
     "required": ["bot_username"],
     "additionalProperties": false
   }'::jsonb, 3)
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- DOWN: Drop in reverse order (run manually if rollback needed)
-- ============================================================
-- DROP TABLE IF EXISTS public.channel_credentials;
-- DROP TABLE IF EXISTS public.channels;
-- DROP TABLE IF EXISTS public.channel_types;
-- DROP TYPE  IF EXISTS channel_status_enum;
