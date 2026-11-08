CREATE TABLE IF NOT EXISTS staff_attendance_records (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL REFERENCES staff_members(id) ON DELETE RESTRICT,
    attendance_date DATE NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT')),
    justification_fee NUMERIC(12, 2) CHECK (justification_fee IS NULL OR justification_fee >= 0),
    justification_date DATE,
    justification_paid BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_staff_attendance_staff_date UNIQUE (staff_id, attendance_date),
    CONSTRAINT ck_staff_attendance_justification_absent
        CHECK (justification_fee IS NULL OR status = 'ABSENT'),
    CONSTRAINT ck_staff_attendance_paid_requested
        CHECK (justification_paid = FALSE OR justification_fee IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_status
    ON staff_attendance_records (staff_id, status);

CREATE TABLE IF NOT EXISTS staff_attendance_justification_payments (
    id BIGSERIAL PRIMARY KEY,
    record_id BIGINT NOT NULL UNIQUE REFERENCES staff_attendance_records(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    payment_date DATE NOT NULL,
    method VARCHAR(120) NOT NULL,
    reference VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_attendance_notifications (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL REFERENCES staff_members(id) ON DELETE RESTRICT,
    message TEXT NOT NULL,
    absences INTEGER NOT NULL CHECK (absences > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_notifications_staff
    ON staff_attendance_notifications (staff_id, id DESC);
