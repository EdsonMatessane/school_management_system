CREATE TABLE IF NOT EXISTS suspension_settings (
    id BIGINT PRIMARY KEY CHECK (id = 1),
    fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    fee_active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO suspension_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS suspension_registrations (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    suspension_date DATE NOT NULL,
    paid BOOLEAN NOT NULL DEFAULT FALSE,
    suspended BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_suspension_registrations_student UNIQUE (student_id),
    CONSTRAINT ck_suspension_registrations_suspended_paid CHECK (NOT suspended OR paid)
);

CREATE INDEX IF NOT EXISTS idx_suspension_registrations_course
    ON suspension_registrations (course_id, created_at DESC);

CREATE TABLE IF NOT EXISTS suspension_registration_payments (
    id BIGSERIAL PRIMARY KEY,
    registration_id BIGINT NOT NULL UNIQUE REFERENCES suspension_registrations(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    method VARCHAR(120) NOT NULL,
    reference VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    teacher_id BIGINT NOT NULL REFERENCES staff_members(id) ON DELETE RESTRICT,
    attendance_date DATE NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT')),
    justification_fee NUMERIC(12, 2) CHECK (justification_fee IS NULL OR justification_fee >= 0),
    justification_date DATE,
    justification_paid BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_attendance_records_student_date UNIQUE (student_id, attendance_date),
    CONSTRAINT ck_attendance_records_justification_absent
        CHECK (justification_fee IS NULL OR status = 'ABSENT'),
    CONSTRAINT ck_attendance_records_paid_requested
        CHECK (NOT justification_paid OR justification_fee IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_course_date
    ON attendance_records (course_id, attendance_date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_records_student_status
    ON attendance_records (student_id, status);

CREATE TABLE IF NOT EXISTS attendance_justification_payments (
    id BIGSERIAL PRIMARY KEY,
    record_id BIGINT NOT NULL UNIQUE REFERENCES attendance_records(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    method VARCHAR(120) NOT NULL,
    reference VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_notifications (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    message TEXT NOT NULL,
    absences INTEGER NOT NULL CHECK (absences > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attendance_notifications_student
    ON attendance_notifications (student_id, id DESC);
