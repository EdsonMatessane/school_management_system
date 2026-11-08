-- CACOIN | Aulas Online | SQL manual (PostgreSQL)
-- Execute este script manualmente no banco CACOIN antes de usar o módulo.
CREATE TABLE IF NOT EXISTS online_lessons (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  course_id BIGINT,
  module_id BIGINT,
  teacher_id BIGINT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  platform VARCHAR(24) NOT NULL DEFAULT 'GOOGLE_MEET',
  meeting_url TEXT NOT NULL,
  meeting_password VARCHAR(120),
  recurrence VARCHAR(24) NOT NULL DEFAULT 'NONE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_online_lesson_time CHECK (end_at > start_at),
  CONSTRAINT ck_online_lesson_platform CHECK (platform IN ('GOOGLE_MEET','ZOOM','TEAMS','OTHER')),
  CONSTRAINT ck_online_lesson_recurrence CHECK (recurrence IN ('NONE','DAILY','WEEKLY','MONTHLY'))
);
CREATE INDEX IF NOT EXISTS ix_online_lessons_start_at ON online_lessons(start_at);
CREATE INDEX IF NOT EXISTS ix_online_lessons_course_id ON online_lessons(course_id);

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

CREATE TABLE IF NOT EXISTS online_lesson_materials (
  id BIGSERIAL PRIMARY KEY,
  lesson_id BIGINT NOT NULL REFERENCES online_lessons(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  type VARCHAR(24) NOT NULL DEFAULT 'LINK',
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_online_material_type CHECK (type IN ('LINK','RECORDING','DOCUMENT','VIDEO'))
);
CREATE INDEX IF NOT EXISTS ix_online_materials_lesson_id ON online_lesson_materials(lesson_id);

CREATE TABLE IF NOT EXISTS online_lesson_attendance (
  id BIGSERIAL PRIMARY KEY,
  lesson_id BIGINT NOT NULL REFERENCES online_lessons(id) ON DELETE CASCADE,
  student_id BIGINT,
  student_name VARCHAR(180),
  status VARCHAR(24) NOT NULL DEFAULT 'PRESENT',
  justification_status VARCHAR(24),
  payment_status VARCHAR(24),
  justification_fee NUMERIC(12,2),
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ck_online_attendance_status CHECK (status IN ('PRESENT','ABSENT')),
  CONSTRAINT ck_online_attendance_justification_status
    CHECK (justification_status IS NULL OR justification_status IN ('NOT_JUSTIFIED','JUSTIFIED')),
  CONSTRAINT ck_online_attendance_payment_status
    CHECK (payment_status IS NULL OR payment_status IN ('PENDING','PAID')),
  CONSTRAINT ck_online_attendance_justification_fee
    CHECK (justification_fee IS NULL OR justification_fee >= 0),
  CONSTRAINT ck_online_attendance_student CHECK (student_id IS NOT NULL OR NULLIF(TRIM(student_name),'') IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS ix_online_attendance_lesson_id ON online_lesson_attendance(lesson_id);
CREATE INDEX IF NOT EXISTS ix_online_attendance_student_id ON online_lesson_attendance(student_id);

CREATE TABLE IF NOT EXISTS online_attendance_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  max_absences INTEGER CHECK (max_absences IS NULL OR max_absences > 0),
  notification_message TEXT,
  justification_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (justification_fee >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
