-- ============================================================
-- UP: dedicated `messaging` schema for conversations/messages
-- ============================================================
-- First step of the Mongoose -> TypeORM/Postgres migration for chat data.
-- Mongo's `conversations`/`messages` collections (chatbot module) keep
-- running in parallel until ChatService is migrated to these tables.

CREATE SCHEMA IF NOT EXISTS messaging;

CREATE TABLE messaging.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  contact_id UUID NULL,
  channel_id UUID NULL REFERENCES public.channels(id) ON DELETE SET NULL,
  channel VARCHAR(30) NOT NULL DEFAULT 'web',
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  visitor JSONB NOT NULL DEFAULT '{}',
  meta JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conv_business_last_msg ON messaging.conversations (business_id, last_message_at DESC);
CREATE INDEX idx_conv_business_status ON messaging.conversations (business_id, status);
CREATE INDEX idx_conv_channel ON messaging.conversations (channel_id);

CREATE TABLE messaging.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES messaging.conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content_encrypted TEXT NOT NULL,
  channel VARCHAR(30),
  tokens_used INT,
  latency_ms INT,
  model VARCHAR(100),
  job_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_msg_conversation_created ON messaging.messages (conversation_id, created_at);
CREATE UNIQUE INDEX idx_msg_job_id ON messaging.messages (job_id) WHERE job_id IS NOT NULL;

-- ============================================================
-- DOWN: Drop schema (run manually if rollback needed)
-- ============================================================
-- DROP TABLE IF EXISTS messaging.messages;
-- DROP TABLE IF EXISTS messaging.conversations;
-- DROP SCHEMA IF EXISTS messaging;
