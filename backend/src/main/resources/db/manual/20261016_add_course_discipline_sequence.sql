ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS next_discipline_number INTEGER;

ALTER TABLE course_disciplines
    ADD COLUMN IF NOT EXISTS discipline_number INTEGER;

WITH numbered_disciplines AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY course_id ORDER BY id) AS number
    FROM course_disciplines
    WHERE discipline_number IS NULL
)
UPDATE course_disciplines d
SET discipline_number = numbered_disciplines.number
FROM numbered_disciplines
WHERE d.id = numbered_disciplines.id;

UPDATE courses c
SET next_discipline_number = COALESCE(
    (SELECT MAX(d.discipline_number) + 1
     FROM course_disciplines d
     WHERE d.course_id = c.id),
    1
)
WHERE next_discipline_number IS NULL;

ALTER TABLE course_disciplines
    ALTER COLUMN discipline_number SET NOT NULL;

ALTER TABLE courses
    ALTER COLUMN next_discipline_number SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_course_disciplines_course_number'
          AND conrelid = 'course_disciplines'::regclass
    ) THEN
        ALTER TABLE course_disciplines
            ADD CONSTRAINT uq_course_disciplines_course_number
            UNIQUE (course_id, discipline_number);
    END IF;
END;
$$;
