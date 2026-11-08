CREATE TABLE IF NOT EXISTS student_fee_charges (
    id BIGSERIAL PRIMARY KEY,
    enrollment_id BIGINT NOT NULL REFERENCES student_enrollments(id) ON DELETE CASCADE,
    fee_type VARCHAR(20) NOT NULL CHECK (fee_type IN ('ENROLLMENT', 'MONTHLY', 'MANUAL')),
    description TEXT NOT NULL,
    period_label VARCHAR(20),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_fee_charges_type_period
        UNIQUE (enrollment_id, fee_type, period_label)
);

CREATE TABLE IF NOT EXISTS student_fee_payments (
    id BIGSERIAL PRIMARY KEY,
    charge_id BIGINT NOT NULL REFERENCES student_fee_charges(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    method VARCHAR(30) NOT NULL,
    reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_fee_charges_type_created
    ON student_fee_charges (fee_type, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_student_fee_payments_charge
    ON student_fee_payments (charge_id, payment_date DESC, id DESC);

INSERT INTO student_fee_charges (
    enrollment_id, fee_type, description, amount, created_at
)
SELECT id, 'ENROLLMENT', COALESCE(enrollment_fee_type, 'Taxa de Inscrição'),
       enrollment_fee_amount, created_at
FROM student_enrollments
WHERE enrollment_fee_amount IS NOT NULL
  AND enrollment_fee_amount > 0
  AND NOT EXISTS (
      SELECT 1
      FROM student_fee_charges charge
      WHERE charge.enrollment_id = student_enrollments.id
        AND charge.fee_type = 'ENROLLMENT'
  );
