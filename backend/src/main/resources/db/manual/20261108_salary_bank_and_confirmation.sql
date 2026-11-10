-- Banco e NIB no cadastro de salário; confirmação de recebimento pelo funcionário.
ALTER TABLE finance_salary_registrations
    ADD COLUMN IF NOT EXISTS bank_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS nib VARCHAR(21);

ALTER TABLE finance_salary_payments
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS confirmed_by_id BIGINT;
