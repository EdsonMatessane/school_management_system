ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS required_staff_fields TEXT NOT NULL DEFAULT '';
