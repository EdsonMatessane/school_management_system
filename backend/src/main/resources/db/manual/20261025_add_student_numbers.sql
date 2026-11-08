ALTER TABLE students
    ADD COLUMN IF NOT EXISTS student_number INTEGER;

UPDATE students
SET student_number = -id;

WITH numbered_students AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS student_number
    FROM students
)
UPDATE students AS student
SET student_number = numbered_students.student_number
FROM numbered_students
WHERE student.id = numbered_students.id;

ALTER TABLE students
    ALTER COLUMN student_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_students_student_number
    ON students (student_number);
