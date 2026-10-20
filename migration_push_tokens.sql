-- HaqDaar: push notification token storage
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    TEXT NOT NULL DEFAULT 'android',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (profile_id, token)
);

CREATE INDEX IF NOT EXISTS push_tokens_profile_id_idx ON push_tokens(profile_id);

ALTER TABLE push_tokens DISABLE ROW LEVEL SECURITY;
