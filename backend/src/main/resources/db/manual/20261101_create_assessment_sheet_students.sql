CREATE TABLE IF NOT EXISTS assessment_sheet_students (
    id BIGSERIAL PRIMARY KEY,
    sheet_id BIGINT NOT NULL REFERENCES assessment_sheets (id) ON DELETE RESTRICT,
    student_id BIGINT NOT NULL REFERENCES students (id) ON DELETE RESTRICT,
    CONSTRAINT uq_assessment_sheet_students UNIQUE (sheet_id, student_id)
);
