CREATE TABLE IF NOT EXISTS student_tests (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    module_id BIGINT REFERENCES course_modules(id) ON DELETE RESTRICT,
    discipline_id BIGINT REFERENCES course_disciplines(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    max_grade NUMERIC(4, 2) NOT NULL CHECK (max_grade > 0 AND max_grade <= 20),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_student_tests_module_or_discipline
        CHECK ((module_id IS NOT NULL AND discipline_id IS NULL)
            OR (module_id IS NULL AND discipline_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS student_test_grades (
    id BIGSERIAL PRIMARY KEY,
    test_id BIGINT NOT NULL REFERENCES student_tests(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    grade NUMERIC(4, 2) CHECK (grade >= 0),
    absent BOOLEAN NOT NULL DEFAULT FALSE,
    observations TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_test_grades_test_student UNIQUE (test_id, student_id),
    CONSTRAINT ck_student_test_grades_grade_or_absent
        CHECK ((absent AND grade IS NULL) OR (NOT absent AND grade IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_student_tests_course
    ON student_tests (course_id, id);

CREATE INDEX IF NOT EXISTS idx_student_tests_module
    ON student_tests (module_id);

CREATE INDEX IF NOT EXISTS idx_student_tests_discipline
    ON student_tests (discipline_id);

CREATE INDEX IF NOT EXISTS idx_student_test_grades_student
    ON student_test_grades (student_id);
