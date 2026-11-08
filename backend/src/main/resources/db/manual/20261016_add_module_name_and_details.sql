ALTER TABLE course_modules
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS details TEXT;

UPDATE course_modules
SET name = 'MÓDULO ' || module_number
WHERE name IS NULL;

UPDATE course_modules
SET details = '{"type":"doc","content":[{"type":"paragraph"}]}'
WHERE details IS NULL;

ALTER TABLE course_modules
    ALTER COLUMN name SET NOT NULL,
    ALTER COLUMN details SET NOT NULL;
