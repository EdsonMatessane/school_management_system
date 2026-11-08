ALTER TABLE assessment_sheet_students ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE assessment_sheet_students ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
