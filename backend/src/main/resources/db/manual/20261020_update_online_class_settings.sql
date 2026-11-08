-- CACOIN | Aulas Online | Migração manual (PostgreSQL)
-- Remove dados específicos de aulas e cria definições de links por plataforma.
DROP INDEX IF EXISTS ix_online_lessons_status;
ALTER TABLE online_lessons
  DROP CONSTRAINT IF EXISTS ck_online_lesson_status,
  DROP CONSTRAINT IF EXISTS ck_online_lesson_capacity,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS capacity,
  DROP COLUMN IF EXISTS recording_url,
  DROP COLUMN IF EXISTS meeting_url;

CREATE TABLE IF NOT EXISTS online_class_platform_settings (
  platform VARCHAR(24) PRIMARY KEY,
  url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_online_class_platform_setting_platform
    CHECK (platform IN ('GOOGLE_MEET','ZOOM','TEAMS','OTHER'))
);
INSERT INTO online_class_platform_settings (platform)
VALUES ('GOOGLE_MEET'), ('ZOOM'), ('TEAMS'), ('OTHER')
ON CONFLICT (platform) DO NOTHING;
