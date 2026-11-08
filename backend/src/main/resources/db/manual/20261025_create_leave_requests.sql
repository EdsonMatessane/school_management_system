CREATE TABLE IF NOT EXISTS leave_settings (
    id BIGINT PRIMARY KEY CHECK (id = 1),
    max_requests_per_month INTEGER CHECK (max_requests_per_month IS NULL OR max_requests_per_month BETWEEN 1 AND 31)
);

INSERT INTO leave_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS leave_requests (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL REFERENCES staff_members(id) ON DELETE RESTRICT,
    request_date DATE NOT NULL,
    leave_date DATE NOT NULL,
    return_date DATE NOT NULL,
    reason TEXT NOT NULL,
    days_calculated INTEGER NOT NULL CHECK (days_calculated >= 1),
    status VARCHAR(60) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_leave_requests_dates CHECK (return_date >= leave_date)
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_staff_request_date
    ON leave_requests (staff_id, request_date);

CREATE INDEX IF NOT EXISTS idx_leave_requests_status
    ON leave_requests (status);
