-- ============================================================
-- UP: Add columns to messaging.conversations for assignment and unread status
-- ============================================================
ALTER TABLE messaging.conversations
ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS last_message_role VARCHAR(50) NULL;
