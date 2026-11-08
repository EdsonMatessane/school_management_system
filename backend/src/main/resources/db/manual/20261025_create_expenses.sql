CREATE TABLE IF NOT EXISTS expense_catalog_items (
    id BIGSERIAL PRIMARY KEY,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('EXPENSE_TYPE', 'SERVICE_TYPE')),
    name VARCHAR(120) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_expense_catalog_items_kind_name
    ON expense_catalog_items (kind, LOWER(name));

CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    expense_type_id BIGINT NOT NULL REFERENCES expense_catalog_items(id) ON DELETE RESTRICT,
    service_type_id BIGINT NOT NULL REFERENCES expense_catalog_items(id) ON DELETE RESTRICT,
    requested_amount NUMERIC(14, 2) NOT NULL CHECK (requested_amount > 0),
    description TEXT NOT NULL,
    specification TEXT,
    service_date DATE NOT NULL,
    status VARCHAR(60) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_service_date ON expenses (service_date DESC);

CREATE TABLE IF NOT EXISTS purchases (
    id BIGSERIAL PRIMARY KEY,
    item_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 1),
    store VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price > 0),
    total_price NUMERIC(14, 2) NOT NULL CHECK (total_price > 0),
    specification TEXT,
    observation TEXT,
    request_date DATE NOT NULL,
    acquisition_date DATE,
    status VARCHAR(60) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchases_request_date ON purchases (request_date DESC);

CREATE TABLE IF NOT EXISTS purchase_returns (
    id BIGSERIAL PRIMARY KEY,
    item_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 1),
    store VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price > 0),
    total_price NUMERIC(14, 2) NOT NULL CHECK (total_price > 0),
    specification TEXT,
    observation TEXT,
    return_date DATE NOT NULL,
    status VARCHAR(60) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_returns_return_date ON purchase_returns (return_date DESC);

CREATE TABLE IF NOT EXISTS sales (
    id BIGSERIAL PRIMARY KEY,
    item_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 1),
    unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price > 0),
    total_price NUMERIC(14, 2) NOT NULL CHECK (total_price > 0),
    specification TEXT,
    buyer VARCHAR(200) NOT NULL,
    observation TEXT,
    sale_date DATE NOT NULL,
    status VARCHAR(60) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales (sale_date DESC);
