ALTER TABLE students
    ADD COLUMN IF NOT EXISTS student_year INTEGER;

UPDATE students
SET student_year = EXTRACT(YEAR FROM created_at)::INTEGER
WHERE student_year IS NULL;

DROP INDEX IF EXISTS uq_students_student_number;

WITH numbered_students AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY student_year ORDER BY id) AS student_number
    FROM students
)
UPDATE students AS student
SET student_number = numbered_students.student_number
FROM numbered_students
WHERE student.id = numbered_students.id;

ALTER TABLE students
    ALTER COLUMN student_year SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_students_year_number
    ON students (student_year, student_number);
