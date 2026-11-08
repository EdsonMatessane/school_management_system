CREATE TABLE IF NOT EXISTS student_exams (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    module_id BIGINT REFERENCES course_modules(id) ON DELETE RESTRICT,
    discipline_id BIGINT REFERENCES course_disciplines(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    max_grade NUMERIC(4, 2) NOT NULL CHECK (max_grade > 0 AND max_grade <= 20),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_student_exams_module_or_discipline
        CHECK ((module_id IS NOT NULL AND discipline_id IS NULL)
            OR (module_id IS NULL AND discipline_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS student_exam_grades (
    id BIGSERIAL PRIMARY KEY,
    exam_id BIGINT NOT NULL REFERENCES student_exams(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    grade NUMERIC(4, 2) CHECK (grade >= 0),
    absent BOOLEAN NOT NULL DEFAULT FALSE,
    observations TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_exam_grades_exam_student UNIQUE (exam_id, student_id),
    CONSTRAINT ck_student_exam_grades_grade_or_absent
        CHECK ((absent AND grade IS NULL) OR (NOT absent AND grade IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_student_exams_course
    ON student_exams (course_id, id);

CREATE INDEX IF NOT EXISTS idx_student_exams_module
    ON student_exams (module_id);

CREATE INDEX IF NOT EXISTS idx_student_exams_discipline
    ON student_exams (discipline_id);

CREATE INDEX IF NOT EXISTS idx_student_exam_grades_student
    ON student_exam_grades (student_id);
