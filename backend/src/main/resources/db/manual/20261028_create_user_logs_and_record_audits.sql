ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS logs_wiped_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS user_logs (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT REFERENCES user_accounts(id) ON DELETE SET NULL,
    actor_code VARCHAR(60) NOT NULL,
    action VARCHAR(20) NOT NULL,
    entity_name VARCHAR(80) NOT NULL,
    entity_id BIGINT,
    changes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_logs_account_created
    ON user_logs (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_logs_created
    ON user_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS record_audits (
    id BIGSERIAL PRIMARY KEY,
    entity_name VARCHAR(80) NOT NULL,
    entity_id BIGINT NOT NULL,
    entry_account_id BIGINT REFERENCES user_accounts(id) ON DELETE SET NULL,
    entered_at TIMESTAMPTZ,
    authorization_account_id BIGINT REFERENCES user_accounts(id) ON DELETE SET NULL,
    authorized_at TIMESTAMPTZ,
    UNIQUE (entity_name, entity_id)
);
