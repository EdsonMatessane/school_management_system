UPDATE staff_members
SET staff_number = -id;

WITH numbered_staff AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY staff_type ORDER BY id) AS staff_number
    FROM staff_members
)
UPDATE staff_members AS staff
SET staff_number = numbered_staff.staff_number
FROM numbered_staff
WHERE staff.id = numbered_staff.id;
