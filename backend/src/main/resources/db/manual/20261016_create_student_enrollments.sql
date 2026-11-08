CREATE TABLE IF NOT EXISTS students (
    id BIGSERIAL PRIMARY KEY,
    first_name TEXT,
    surname TEXT,
    father_name TEXT,
    mother_name TEXT,
    gender VARCHAR(1) CHECK (gender IN ('M', 'F')),
    birth_date DATE,
    bi_number VARCHAR(13) UNIQUE,
    nuit VARCHAR(9) UNIQUE,
    issue_date DATE,
    expiry_date DATE,
    country TEXT,
    birth_province TEXT,
    birth_district TEXT,
    address_province TEXT,
    address_district TEXT,
    address TEXT,
    phone VARCHAR(32),
    email TEXT
);

CREATE TABLE IF NOT EXISTS student_enrollments (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id),
    course_id BIGINT REFERENCES courses(id),
    course_name TEXT,
    category_name TEXT,
    level_name TEXT,
    modality_name TEXT,
    duration_months INTEGER,
    monthly_fee_type TEXT,
    monthly_fee_amount NUMERIC(12, 2),
    enrollment_fee_type TEXT,
    enrollment_fee_amount NUMERIC(12, 2),
    manual_fee_type TEXT,
    manual_fee_amount NUMERIC(12, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id
    ON student_enrollments (student_id, created_at);
