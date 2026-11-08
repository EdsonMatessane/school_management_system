CREATE TABLE IF NOT EXISTS uniform_settings (
    id BIGINT PRIMARY KEY CHECK (id = 1),
    fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    fee_active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO uniform_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS uniform_stock (
    id BIGSERIAL PRIMARY KEY,
    size VARCHAR(8) NOT NULL UNIQUE,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0)
);

CREATE TABLE IF NOT EXISTS uniform_orders (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    size VARCHAR(8) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    observation VARCHAR(120) NOT NULL,
    stock_reserved BOOLEAN NOT NULL DEFAULT FALSE,
    paid BOOLEAN NOT NULL DEFAULT FALSE,
    delivered BOOLEAN NOT NULL DEFAULT FALSE,
    delivery_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_uniform_orders_student UNIQUE (student_id),
    CONSTRAINT ck_uniform_orders_delivered_paid CHECK (NOT delivered OR paid)
);

CREATE INDEX IF NOT EXISTS idx_uniform_orders_course
    ON uniform_orders (course_id, created_at DESC);

CREATE TABLE IF NOT EXISTS uniform_order_payments (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL UNIQUE REFERENCES uniform_orders(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    method VARCHAR(120) NOT NULL,
    reference VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
