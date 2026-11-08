-- CACOIN | Aulas Online | Migração manual (PostgreSQL)
ALTER TABLE online_lessons
  ADD COLUMN IF NOT EXISTS meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS meeting_password VARCHAR(120);
