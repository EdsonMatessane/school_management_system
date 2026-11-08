ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_account_id BIGINT;
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS author_account_id BIGINT;
