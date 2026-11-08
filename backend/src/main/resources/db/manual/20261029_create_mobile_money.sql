-- Mobile Money: pagamentos dos estudantes por carteira móvel (M-Pesa, e-Mola, mKesh).
-- Só guarda o ID do estudante (regra da estrutura da base de dados). payer_number é o número da
-- carteira usada para pagar (instrumento de pagamento, pode não ser o telefone do estudante).
CREATE TABLE IF NOT EXISTS mobile_money_transactions (
    id                 BIGSERIAL PRIMARY KEY,
    student_id         BIGINT        NOT NULL REFERENCES students (id),
    category           VARCHAR(20)   NOT NULL,
    wallet             VARCHAR(12)   NOT NULL,
    payer_number       VARCHAR(15)   NOT NULL,
    amount             NUMERIC(12,2) NOT NULL,
    status             VARCHAR(12)   NOT NULL DEFAULT 'PENDING',
    provider_reference VARCHAR(80),
    failure_reason     VARCHAR(300),
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at       TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS mobile_money_transaction_items (
    id             BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT        NOT NULL REFERENCES mobile_money_transactions (id) ON DELETE CASCADE,
    target_id      BIGINT        NOT NULL,
    description    VARCHAR(200)  NOT NULL,
    amount         NUMERIC(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mobile_money_transactions_status
    ON mobile_money_transactions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mobile_money_transactions_student
    ON mobile_money_transactions (student_id);
CREATE INDEX IF NOT EXISTS idx_mobile_money_items_transaction
    ON mobile_money_transaction_items (transaction_id);
