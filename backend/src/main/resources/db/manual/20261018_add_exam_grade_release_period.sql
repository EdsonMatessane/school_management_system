ALTER TABLE exam_settings
    ADD COLUMN IF NOT EXISTS grade_release_start TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN IF NOT EXISTS grade_release_end TIMESTAMP WITHOUT TIME ZONE;

ALTER TABLE exam_settings
    DROP CONSTRAINT IF EXISTS ck_exam_settings_grade_period;

ALTER TABLE exam_settings
    ADD CONSTRAINT ck_exam_settings_grade_period
        CHECK (grade_release_start IS NULL OR grade_release_end IS NULL OR grade_release_start < grade_release_end);
