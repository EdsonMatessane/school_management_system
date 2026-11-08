CREATE TABLE IF NOT EXISTS finance_settings (
    id BIGINT PRIMARY KEY CHECK (id = 1),
    processing_period_start TIMESTAMP WITHOUT TIME ZONE,
    processing_period_end TIMESTAMP WITHOUT TIME ZONE,
    payment_rule VARCHAR(10) NOT NULL DEFAULT 'FULL' CHECK (payment_rule IN ('FULL', 'PARTIAL')),
    max_advance_months INTEGER NOT NULL DEFAULT 1 CHECK (max_advance_months BETWEEN 0 AND 12),
    CONSTRAINT ck_finance_settings_period
        CHECK (processing_period_start IS NULL OR processing_period_end IS NULL
               OR processing_period_start < processing_period_end)
);

INSERT INTO finance_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS finance_positions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_salary_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_bonus_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_salary_registrations (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL REFERENCES staff_members(id) ON DELETE RESTRICT,
    position_id BIGINT NOT NULL REFERENCES finance_positions(id) ON DELETE RESTRICT,
    salary_type_id BIGINT NOT NULL REFERENCES finance_salary_types(id) ON DELETE RESTRICT,
    salary NUMERIC(12, 2) NOT NULL CHECK (salary > 0),
    bonus_type_id BIGINT REFERENCES finance_bonus_types(id) ON DELETE RESTRICT,
    bonus NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (bonus >= 0),
    observation VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_finance_salary_registrations_staff UNIQUE (staff_id),
    CONSTRAINT ck_finance_salary_registrations_bonus
        CHECK ((bonus_type_id IS NULL AND bonus = 0) OR (bonus_type_id IS NOT NULL AND bonus > 0))
);

CREATE TABLE IF NOT EXISTS finance_salary_payments (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL REFERENCES staff_members(id) ON DELETE RESTRICT,
    reference_month DATE NOT NULL CHECK (EXTRACT(DAY FROM reference_month) = 1),
    kind VARCHAR(12) NOT NULL CHECK (kind IN ('PROCESSING', 'ADVANCE', 'LIQUIDATION')),
    salary_amount NUMERIC(12, 2) NOT NULL CHECK (salary_amount > 0),
    paid_amount NUMERIC(12, 2) NOT NULL CHECK (paid_amount > 0),
    bonus_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0),
    discounted_balance NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discounted_balance >= 0),
    observation VARCHAR(500),
    processed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    liquidated_at TIMESTAMPTZ,
    CONSTRAINT uq_finance_salary_payments_staff_month UNIQUE (staff_id, reference_month),
    CONSTRAINT ck_finance_salary_payments_balance
        CHECK (paid_amount + discounted_balance = salary_amount)
);

CREATE INDEX IF NOT EXISTS idx_finance_salary_payments_month
    ON finance_salary_payments (reference_month DESC);
