CREATE TABLE IF NOT EXISTS payment_methods (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    description VARCHAR(500),
    active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO payment_methods (name)
SELECT name FROM (VALUES
    ('Numerário'),
    ('Transferência Bancária'),
    ('Carteira Móvel - Mpesa/E-mola/M-kesh')
) AS defaults(name)
WHERE NOT EXISTS (SELECT 1 FROM payment_methods);

ALTER TABLE student_fee_payments ALTER COLUMN method TYPE VARCHAR(120);

UPDATE student_fee_payments SET method = 'Numerário' WHERE method = 'CASH';
UPDATE student_fee_payments SET method = 'Transferência Bancária' WHERE method = 'BANK_TRANSFER';
