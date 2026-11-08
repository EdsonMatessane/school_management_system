CREATE TABLE IF NOT EXISTS user_settings (
    id BIGINT PRIMARY KEY CHECK (id = 1),
    uppercase_characters VARCHAR(80) NOT NULL DEFAULT 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase_characters VARCHAR(80) NOT NULL DEFAULT 'abcdefghijklmnopqrstuvwxyz',
    number_characters VARCHAR(20) NOT NULL DEFAULT '0123456789',
    special_characters VARCHAR(120) NOT NULL DEFAULT '!@#$%^&*()-_=+[]{};:,.?/|\~`''"<>',
    max_attempts INTEGER NOT NULL DEFAULT 3,
    max_length INTEGER NOT NULL DEFAULT 8,
    max_uppercase INTEGER NOT NULL DEFAULT 2,
    min_digits INTEGER NOT NULL DEFAULT 1,
    min_special INTEGER NOT NULL DEFAULT 1,
    staff_access_start VARCHAR(5),
    staff_access_end VARCHAR(5),
    student_access_start VARCHAR(5),
    student_access_end VARCHAR(5)
);

INSERT INTO user_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_accounts (
    id BIGSERIAL PRIMARY KEY,
    kind VARCHAR(10) NOT NULL,
    code VARCHAR(40) NOT NULL UNIQUE,
    admin_number INTEGER,
    student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
    staff_id BIGINT REFERENCES staff_members(id) ON DELETE CASCADE,
    first_name TEXT,
    surname TEXT,
    password_hash TEXT,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(60) NOT NULL DEFAULT 'ACTIVE',
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    access_start VARCHAR(5),
    access_end VARCHAR(5),
    notes TEXT,
    last_access_at TIMESTAMPTZ,
    deactivated_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_accounts_admin_number
    ON user_accounts (admin_number) WHERE kind = 'ADMIN';

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_accounts_student
    ON user_accounts (student_id) WHERE student_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_accounts_staff
    ON user_accounts (staff_id) WHERE staff_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_accounts_kind_status
    ON user_accounts (kind, status);
