ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS next_module_number INTEGER;

UPDATE courses c
SET next_module_number = COALESCE(
    (SELECT MAX(m.module_number) + 1
     FROM course_modules m
     WHERE m.course_id = c.id),
    1
)
WHERE next_module_number IS NULL;

ALTER TABLE courses
    ALTER COLUMN next_module_number SET NOT NULL;
