CREATE TABLE IF NOT EXISTS test_registrations (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    test_type VARCHAR(16) NOT NULL CHECK (test_type IN ('NORMAL', 'RECOVERY', 'SPECIAL')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0 AND paid_amount <= amount),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_registrations_course_type
    ON test_registrations (course_id, test_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_registrations_student
    ON test_registrations (student_id);

CREATE TABLE IF NOT EXISTS test_registration_payments (
    id BIGSERIAL PRIMARY KEY,
    registration_id BIGINT NOT NULL REFERENCES test_registrations(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    method VARCHAR(120) NOT NULL,
    reference VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_registration_payments_registration
    ON test_registration_payments (registration_id, payment_date DESC, id DESC);
