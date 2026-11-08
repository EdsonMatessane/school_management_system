CREATE TABLE IF NOT EXISTS mobile_money_wallets (
    id BIGSERIAL PRIMARY KEY,
    wallet VARCHAR(20) NOT NULL UNIQUE,
    account_number VARCHAR(20),
    account_name VARCHAR(120),
    active BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE mobile_money_transactions
    ADD COLUMN IF NOT EXISTS destination_number VARCHAR(20);
