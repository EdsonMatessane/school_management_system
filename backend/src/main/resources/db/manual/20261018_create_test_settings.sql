CREATE TABLE IF NOT EXISTS test_settings (
    id BIGINT PRIMARY KEY CHECK (id = 1),
    normal_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    recovery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    special_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    normal_fee_active BOOLEAN NOT NULL DEFAULT TRUE,
    recovery_fee_active BOOLEAN NOT NULL DEFAULT TRUE,
    special_fee_active BOOLEAN NOT NULL DEFAULT TRUE,
    test_period_start TIMESTAMP WITHOUT TIME ZONE,
    test_period_end TIMESTAMP WITHOUT TIME ZONE,
    grade_release_start TIMESTAMP WITHOUT TIME ZONE,
    grade_release_end TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT ck_test_settings_test_period
        CHECK (test_period_start IS NULL OR test_period_end IS NULL OR test_period_start < test_period_end),
    CONSTRAINT ck_test_settings_grade_period
        CHECK (grade_release_start IS NULL OR grade_release_end IS NULL OR grade_release_start < grade_release_end)
);

INSERT INTO test_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
