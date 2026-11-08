CREATE TABLE IF NOT EXISTS mobile_money_transactions (
    id BIGSERIAL PRIMARY KEY,
    reference VARCHAR(30) UNIQUE,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    kind VARCHAR(30) NOT NULL,
    item_id BIGINT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    wallet VARCHAR(20) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    status VARCHAR(60) NOT NULL DEFAULT 'PENDING',
    provider_reference VARCHAR(80),
    failure_reason TEXT,
    recorded BOOLEAN NOT NULL DEFAULT FALSE,
    initiated_account_id BIGINT REFERENCES user_accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mobile_money_transactions_student
    ON mobile_money_transactions (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mobile_money_transactions_status
    ON mobile_money_transactions (status);

CREATE INDEX IF NOT EXISTS idx_mobile_money_transactions_item
    ON mobile_money_transactions (kind, item_id, status);
