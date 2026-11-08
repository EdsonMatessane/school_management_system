UPDATE cob_reports
SET status = 'COMPLETO'
WHERE status IN ('COMPLETED', 'ARCHIVED');

UPDATE cob_reports
SET status = 'DRAFT'
WHERE status IS NULL;
