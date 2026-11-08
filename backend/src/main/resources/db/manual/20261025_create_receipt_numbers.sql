CREATE TABLE IF NOT EXISTS receipt_numbers (
    id BIGSERIAL PRIMARY KEY,
    kind VARCHAR(30) NOT NULL,
    record_id BIGINT NOT NULL,
    number INTEGER NOT NULL CHECK (number >= 1),
    CONSTRAINT uq_receipt_numbers_kind_record UNIQUE (kind, record_id),
    CONSTRAINT uq_receipt_numbers_kind_number UNIQUE (kind, number)
);
