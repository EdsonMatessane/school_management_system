BEGIN;

ALTER TABLE report_folders
  ADD COLUMN IF NOT EXISTS parent_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = current_schema()
      AND table_name = 'report_folders'
      AND constraint_name = 'fk_report_folders_parent'
  ) THEN
    ALTER TABLE report_folders
      ADD CONSTRAINT fk_report_folders_parent
      FOREIGN KEY (parent_id) REFERENCES report_folders(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_report_folders_parent
  ON report_folders(parent_id);

COMMIT;
