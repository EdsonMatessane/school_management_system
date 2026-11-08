-- CACOIN | Aulas Online | Migração manual de presenças (PostgreSQL)
ALTER TABLE online_lesson_attendance
  ADD COLUMN IF NOT EXISTS justification_status VARCHAR(24),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(24),
  ADD COLUMN IF NOT EXISTS justification_fee NUMERIC(12,2);

UPDATE online_lesson_attendance
SET status = 'PRESENT',
    justification_status = NULL,
    payment_status = NULL
WHERE status = 'LATE';

UPDATE online_lesson_attendance
SET status = 'ABSENT',
    justification_status = 'JUSTIFIED',
    payment_status = 'PENDING'
WHERE status = 'EXCUSED';

UPDATE online_lesson_attendance
SET justification_status = 'NOT_JUSTIFIED',
    payment_status = 'PENDING',
    justification_fee = 0
WHERE status = 'ABSENT'
  AND justification_status IS NULL;

UPDATE online_lesson_attendance
SET justification_fee = 0
WHERE status = 'ABSENT'
  AND justification_fee IS NULL;

ALTER TABLE online_lesson_attendance
  DROP CONSTRAINT IF EXISTS ck_online_attendance_status,
  ADD CONSTRAINT ck_online_attendance_status
    CHECK (status IN ('PRESENT','ABSENT')),
  ADD CONSTRAINT ck_online_attendance_justification_status
    CHECK (justification_status IS NULL OR justification_status IN ('NOT_JUSTIFIED','JUSTIFIED')),
  ADD CONSTRAINT ck_online_attendance_payment_status
    CHECK (payment_status IS NULL OR payment_status IN ('PENDING','PAID')),
  ADD CONSTRAINT ck_online_attendance_justification_fee
    CHECK (justification_fee IS NULL OR justification_fee >= 0);

CREATE TABLE IF NOT EXISTS online_attendance_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  max_absences INTEGER CHECK (max_absences IS NULL OR max_absences > 0),
  notification_message TEXT,
  justification_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (justification_fee >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
