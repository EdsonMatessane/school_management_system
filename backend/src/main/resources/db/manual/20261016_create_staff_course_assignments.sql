CREATE TABLE IF NOT EXISTS staff_course_assignments (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_staff_course_assignments_staff_course UNIQUE (staff_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_course_assignments_staff
    ON staff_course_assignments (staff_id, id);
