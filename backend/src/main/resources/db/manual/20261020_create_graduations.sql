CREATE TABLE IF NOT EXISTS graduation_settings (
    id BIGINT PRIMARY KEY CHECK (id = 1),
    graduation_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    graduation_fee_active BOOLEAN NOT NULL DEFAULT TRUE,
    included_guests INTEGER NOT NULL DEFAULT 2 CHECK (included_guests >= 0),
    extra_guest_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    extra_guest_fee_active BOOLEAN NOT NULL DEFAULT TRUE,
    special_exam_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    special_exam_fee_active BOOLEAN NOT NULL DEFAULT TRUE,
    graduation_period_start TIMESTAMP WITHOUT TIME ZONE,
    graduation_period_end TIMESTAMP WITHOUT TIME ZONE,
    ceremony_date DATE,
    ceremony_start_time TIME,
    ceremony_end_time TIME,
    CONSTRAINT ck_graduation_settings_period
        CHECK (graduation_period_start IS NULL OR graduation_period_end IS NULL
               OR graduation_period_start < graduation_period_end),
    CONSTRAINT ck_graduation_settings_ceremony_time
        CHECK (ceremony_start_time IS NULL OR ceremony_end_time IS NULL
               OR ceremony_start_time < ceremony_end_time)
);

INSERT INTO graduation_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS graduation_requirements (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS graduation_registrations (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    guests INTEGER NOT NULL DEFAULT 0 CHECK (guests >= 0),
    fee_amount NUMERIC(12, 2) NOT NULL CHECK (fee_amount > 0),
    requirements_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (requirements_amount >= 0),
    extra_guests_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (extra_guests_amount >= 0),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    paid BOOLEAN NOT NULL DEFAULT FALSE,
    graduated BOOLEAN NOT NULL DEFAULT FALSE,
    graduation_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_graduation_registrations_student UNIQUE (student_id),
    CONSTRAINT ck_graduation_registrations_graduated_paid CHECK (NOT graduated OR paid)
);

CREATE INDEX IF NOT EXISTS idx_graduation_registrations_course
    ON graduation_registrations (course_id, created_at DESC);

CREATE TABLE IF NOT EXISTS graduation_registration_payments (
    id BIGSERIAL PRIMARY KEY,
    registration_id BIGINT NOT NULL UNIQUE REFERENCES graduation_registrations(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    method VARCHAR(120) NOT NULL,
    reference VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS graduates (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL UNIQUE REFERENCES students(id) ON DELETE RESTRICT,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    registration_id BIGINT UNIQUE REFERENCES graduation_registrations(id) ON DELETE RESTRICT,
    graduation_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_graduates_course
    ON graduates (course_id, graduation_date DESC);
