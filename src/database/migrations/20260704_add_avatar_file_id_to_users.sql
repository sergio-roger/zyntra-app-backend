-- Migration: Add avatar_file_id to security.users
ALTER TABLE security.users
  ADD COLUMN IF NOT EXISTS avatar_file_id UUID NULL;
