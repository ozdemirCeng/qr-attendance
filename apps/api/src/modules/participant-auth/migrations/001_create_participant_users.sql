-- Participant Users table for self-service accounts
CREATE TABLE IF NOT EXISTS participant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(32),
  phone_normalized VARCHAR(20),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_participant_users_email ON participant_users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_participant_users_phone ON participant_users (phone_normalized) WHERE phone_normalized IS NOT NULL;
