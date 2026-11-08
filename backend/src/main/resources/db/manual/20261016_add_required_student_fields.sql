ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS required_student_fields TEXT NOT NULL DEFAULT '';
