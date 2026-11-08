-- Permite vários registos de notas para o mesmo curso e ano lectivo.
ALTER TABLE assessment_sheets
    DROP CONSTRAINT IF EXISTS uq_assessment_sheets_course_year;
