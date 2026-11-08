CREATE TABLE IF NOT EXISTS exam_settings (
    id BIGINT PRIMARY KEY CHECK (id = 1),
    normal_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    recurrence_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    special_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    normal_fee_active BOOLEAN NOT NULL DEFAULT TRUE,
    recurrence_fee_active BOOLEAN NOT NULL DEFAULT TRUE,
    special_fee_active BOOLEAN NOT NULL DEFAULT TRUE,
    exam_period_start TIMESTAMP WITHOUT TIME ZONE,
    exam_period_end TIMESTAMP WITHOUT TIME ZONE,
    grade_release_start TIMESTAMP WITHOUT TIME ZONE,
    grade_release_end TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT ck_exam_settings_exam_period
        CHECK (exam_period_start IS NULL OR exam_period_end IS NULL OR exam_period_start < exam_period_end),
    CONSTRAINT ck_exam_settings_grade_period
        CHECK (grade_release_start IS NULL OR grade_release_end IS NULL OR grade_release_start < grade_release_end)
);

INSERT INTO exam_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
