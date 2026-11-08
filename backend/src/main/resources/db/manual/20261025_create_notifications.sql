CREATE TABLE IF NOT EXISTS notification_settings (
    channel VARCHAR(20) PRIMARY KEY CHECK (channel IN ('WHATSAPP', 'SMS')),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    provider VARCHAR(120),
    api_url TEXT,
    auth_header VARCHAR(60) NOT NULL DEFAULT 'Authorization',
    auth_scheme VARCHAR(30) DEFAULT 'Bearer',
    api_token TEXT,
    sender VARCHAR(120),
    country_code VARCHAR(6) NOT NULL DEFAULT '258',
    body_template TEXT NOT NULL DEFAULT '{"from":"{from}","to":"{to}","message":"{message}"}'
);

INSERT INTO notification_settings (channel)
VALUES ('WHATSAPP'), ('SMS')
ON CONFLICT (channel) DO NOTHING;

CREATE TABLE IF NOT EXISTS notification_messages (
    id BIGSERIAL PRIMARY KEY,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('WHATSAPP', 'SMS')),
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('STAFF', 'STUDENT', 'MANUAL')),
    staff_id BIGINT REFERENCES staff_members(id) ON DELETE RESTRICT,
    student_id BIGINT REFERENCES students(id) ON DELETE RESTRICT,
    manual_phone VARCHAR(32),
    message TEXT NOT NULL,
    status VARCHAR(60) NOT NULL,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMPTZ,
    CONSTRAINT ck_notification_messages_recipient CHECK (
        (recipient_type = 'STAFF' AND staff_id IS NOT NULL AND student_id IS NULL AND manual_phone IS NULL)
        OR (recipient_type = 'STUDENT' AND student_id IS NOT NULL AND staff_id IS NULL AND manual_phone IS NULL)
        OR (recipient_type = 'MANUAL' AND manual_phone IS NOT NULL AND staff_id IS NULL AND student_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_notification_messages_channel_created
    ON notification_messages (channel, created_at DESC);
