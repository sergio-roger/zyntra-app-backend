-- ==============================================================================
-- UP: Track whether a message has been read by an agent
-- ==============================================================================
ALTER TABLE messaging.messages ADD COLUMN is_read boolean NOT NULL DEFAULT false;

-- Only visitor ("user") messages need to be marked read by an agent; anything
-- already authored by the bot/agent is trivially "read" from the agent's side.
UPDATE messaging.messages SET is_read = true WHERE role <> 'user';

CREATE INDEX idx_messages_conversation_unread
ON messaging.messages (conversation_id)
WHERE role = 'user' AND is_read = false;
