CREATE TABLE IF NOT EXISTS staff_members (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    staff_type VARCHAR(16) NOT NULL CHECK (staff_type IN ('hr', 'teachers', 'other')),
    staff_number INTEGER NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    first_name TEXT,
    surname TEXT,
    father_name TEXT,
    mother_name TEXT,
    gender VARCHAR(1) CHECK (gender IN ('M', 'F')),
    birth_date DATE,
    bi_number VARCHAR(13),
    nuit VARCHAR(9),
    issue_date DATE,
    expiry_date DATE,
    country TEXT,
    birth_province TEXT,
    birth_district TEXT,
    address_province TEXT,
    address_district TEXT,
    address TEXT,
    phone VARCHAR(32),
    email TEXT,
    training_course TEXT,
    institution TEXT,
    entry_year INTEGER,
    completion_year INTEGER,
    training_in_progress BOOLEAN NOT NULL DEFAULT FALSE,
    certificate_storage_name TEXT,
    certificate_file_name TEXT,
    certificate_content_type VARCHAR(100),
    cv_storage_name TEXT,
    cv_file_name TEXT,
    cv_content_type VARCHAR(100)
);

CREATE SEQUENCE IF NOT EXISTS staff_hr_code_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS staff_teacher_code_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS staff_other_code_seq START WITH 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_members_type_number
    ON staff_members (staff_type, staff_number);

CREATE INDEX IF NOT EXISTS idx_staff_members_type_active
    ON staff_members (staff_type, active, id);
