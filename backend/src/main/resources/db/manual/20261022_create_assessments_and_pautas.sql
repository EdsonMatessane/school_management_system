CREATE TABLE IF NOT EXISTS assessment_sheets (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    academic_year INTEGER NOT NULL CHECK (academic_year BETWEEN 2000 AND 2100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_assessment_sheets_course_year UNIQUE (course_id, academic_year)
);

CREATE TABLE IF NOT EXISTS assessment_sheet_teachers (
    id BIGSERIAL PRIMARY KEY,
    sheet_id BIGINT NOT NULL REFERENCES assessment_sheets(id) ON DELETE RESTRICT,
    teacher_id BIGINT NOT NULL REFERENCES staff_members(id) ON DELETE RESTRICT,
    CONSTRAINT uq_assessment_sheet_teachers UNIQUE (sheet_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS assessment_grades (
    id BIGSERIAL PRIMARY KEY,
    sheet_id BIGINT NOT NULL REFERENCES assessment_sheets(id) ON DELETE RESTRICT,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    component VARCHAR(2) NOT NULL CHECK (component IN ('T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'E1', 'E2', 'TR')),
    grade NUMERIC(4, 2) CHECK (grade IS NULL OR (grade >= 0 AND grade <= 20)),
    absent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_assessment_grades_sheet_student_component UNIQUE (sheet_id, student_id, component),
    CONSTRAINT ck_assessment_grades_absent_without_grade CHECK (NOT absent OR grade IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_assessment_grades_student
    ON assessment_grades (student_id);

CREATE TABLE IF NOT EXISTS pauta_settings (
    id BIGINT PRIMARY KEY CHECK (id = 1),
    launch_period_start TIMESTAMP WITHOUT TIME ZONE,
    launch_period_end TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT ck_pauta_settings_period
        CHECK (launch_period_start IS NULL OR launch_period_end IS NULL
               OR launch_period_start < launch_period_end)
);

INSERT INTO pauta_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS pauta_entries (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    academic_year INTEGER NOT NULL CHECK (academic_year BETWEEN 2000 AND 2100),
    t1 NUMERIC(4, 2) NOT NULL CHECK (t1 BETWEEN 0 AND 20),
    t2 NUMERIC(4, 2) NOT NULL CHECK (t2 BETWEEN 0 AND 20),
    t3 NUMERIC(4, 2) NOT NULL CHECK (t3 BETWEEN 0 AND 20),
    t4 NUMERIC(4, 2) NOT NULL CHECK (t4 BETWEEN 0 AND 20),
    t5 NUMERIC(4, 2) NOT NULL CHECK (t5 BETWEEN 0 AND 20),
    t6 NUMERIC(4, 2) NOT NULL CHECK (t6 BETWEEN 0 AND 20),
    frequency INTEGER NOT NULL CHECK (frequency BETWEEN 0 AND 20),
    exam1 NUMERIC(4, 2) NOT NULL CHECK (exam1 BETWEEN 0 AND 20),
    exam2 NUMERIC(4, 2) NOT NULL CHECK (exam2 BETWEEN 0 AND 20),
    work_grade NUMERIC(4, 2) NOT NULL CHECK (work_grade BETWEEN 0 AND 20),
    final_average INTEGER NOT NULL CHECK (final_average BETWEEN 0 AND 20),
    result VARCHAR(10) NOT NULL CHECK (result IN ('APPROVED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_pauta_entries_student_year UNIQUE (student_id, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_pauta_entries_course_year
    ON pauta_entries (course_id, academic_year);
