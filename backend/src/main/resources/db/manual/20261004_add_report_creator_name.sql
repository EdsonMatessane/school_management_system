ALTER TABLE cob_reports
    ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(201);
