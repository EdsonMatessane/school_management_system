-- Configurações > Pagamentos > Período: regras de vencimento das mensalidades.
-- Os valores por omissão mantêm o comportamento anterior (vencimento no dia 10, sem tolerância,
-- sem ajuste de fins de semana/feriados e primeiro mês com a data da inscrição se já passou).
CREATE TABLE IF NOT EXISTS payment_period_settings (
    id BIGINT PRIMARY KEY,
    due_day INTEGER NOT NULL DEFAULT 10 CHECK (due_day BETWEEN 1 AND 31),
    grace_days INTEGER NOT NULL DEFAULT 0 CHECK (grace_days BETWEEN 0 AND 90),
    non_business_adjustment VARCHAR(30) NOT NULL DEFAULT 'NONE'
        CHECK (non_business_adjustment IN ('NONE', 'NEXT_BUSINESS_DAY', 'PREVIOUS_BUSINESS_DAY')),
    saturday_non_business BOOLEAN NOT NULL DEFAULT TRUE,
    sunday_non_business BOOLEAN NOT NULL DEFAULT TRUE,
    holidays_non_business BOOLEAN NOT NULL DEFAULT TRUE,
    first_month_policy VARCHAR(30) NOT NULL DEFAULT 'ENROLLMENT_DATE_IF_LATE'
        CHECK (first_month_policy IN ('ENROLLMENT_DATE_IF_LATE', 'PATTERN_DAY'))
);

INSERT INTO payment_period_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
