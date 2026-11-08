BEGIN;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS report_folder_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = current_schema()
      AND table_name = 'companies'
      AND constraint_name = 'fk_companies_report_folder'
  ) THEN
    ALTER TABLE companies
      ADD CONSTRAINT fk_companies_report_folder
      FOREIGN KEY (report_folder_id) REFERENCES report_folders(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_companies_report_folder
  ON companies(report_folder_id);

COMMIT;
