ALTER TABLE participant_users
ADD COLUMN IF NOT EXISTS avatar_data_url TEXT;
