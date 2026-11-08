ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS academic_year_end_month INTEGER NOT NULL DEFAULT 12;

ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS previous_year_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS system_year INTEGER;

ALTER TABLE student_enrollments
    ADD COLUMN IF NOT EXISTS enrollment_date DATE;

UPDATE student_enrollments
SET enrollment_date = (created_at AT TIME ZONE 'Africa/Maputo')::DATE
WHERE enrollment_date IS NULL;
