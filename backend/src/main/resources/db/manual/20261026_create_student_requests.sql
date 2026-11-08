CREATE TABLE IF NOT EXISTS student_request_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_request_settings (
    id BIGINT PRIMARY KEY CHECK (id = 1),
    approve_message TEXT,
    reject_message TEXT,
    complete_message TEXT
);

INSERT INTO student_request_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS student_requests (
    id BIGSERIAL PRIMARY KEY,
    request_number INTEGER NOT NULL UNIQUE,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    type_id BIGINT NOT NULL REFERENCES student_request_types(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    request_date DATE NOT NULL,
    status VARCHAR(60) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_requests_student
    ON student_requests (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_requests_course
    ON student_requests (course_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_requests_status
    ON student_requests (status);

CREATE TABLE IF NOT EXISTS student_request_attachments (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES student_requests(id) ON DELETE CASCADE,
    storage_name VARCHAR(120) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_request_attachments_request
    ON student_request_attachments (request_id);
