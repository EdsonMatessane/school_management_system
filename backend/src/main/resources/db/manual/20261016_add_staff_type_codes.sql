ALTER TABLE staff_members
    ADD COLUMN IF NOT EXISTS staff_number INTEGER;

ALTER TABLE staff_members
    DROP CONSTRAINT IF EXISTS staff_members_staff_type_check;

UPDATE staff_members
SET staff_type = 'teachers'
WHERE staff_type = 'teacher';

WITH numbered_staff AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY staff_type ORDER BY id) AS staff_number
    FROM staff_members
    WHERE staff_number IS NULL
)
UPDATE staff_members AS staff
SET staff_number = numbered_staff.staff_number
FROM numbered_staff
WHERE staff.id = numbered_staff.id;

ALTER TABLE staff_members
    ALTER COLUMN staff_number SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'staff_members_staff_type_check'
          AND conrelid = 'staff_members'::regclass
    ) THEN
        ALTER TABLE staff_members
            ADD CONSTRAINT staff_members_staff_type_check
            CHECK (staff_type IN ('hr', 'teachers', 'other'));
    END IF;
END;
$$;

CREATE SEQUENCE IF NOT EXISTS staff_hr_code_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS staff_teacher_code_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS staff_other_code_seq START WITH 1;

SELECT setval(
    'staff_hr_code_seq',
    COALESCE(MAX(staff_number), 1),
    COALESCE(MAX(staff_number), 0) > 0
)
FROM staff_members
WHERE staff_type = 'hr';

SELECT setval(
    'staff_teacher_code_seq',
    COALESCE(MAX(staff_number), 1),
    COALESCE(MAX(staff_number), 0) > 0
)
FROM staff_members
WHERE staff_type = 'teachers';

SELECT setval(
    'staff_other_code_seq',
    COALESCE(MAX(staff_number), 1),
    COALESCE(MAX(staff_number), 0) > 0
)
FROM staff_members
WHERE staff_type = 'other';

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_members_type_number
    ON staff_members (staff_type, staff_number);
