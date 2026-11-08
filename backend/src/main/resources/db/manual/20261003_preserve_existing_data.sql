BEGIN;

-- Preserve existing report data while adding the image metadata and content
-- columns required by the current report entities.
ALTER TABLE date_verifications
  ADD COLUMN IF NOT EXISTS evidence_image_file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS evidence_image_content_type VARCHAR(255),
  ADD COLUMN IF NOT EXISTS evidence_image_content BYTEA;

ALTER TABLE simo_records
  ADD COLUMN IF NOT EXISTS evidence_image_file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS evidence_image_content_type VARCHAR(255),
  ADD COLUMN IF NOT EXISTS evidence_image_content BYTEA;

ALTER TABLE browser_status
  ADD COLUMN IF NOT EXISTS evidence_image_file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS evidence_image_content_type VARCHAR(255),
  ADD COLUMN IF NOT EXISTS evidence_image_content BYTEA;

ALTER TABLE cob_records
  ADD COLUMN IF NOT EXISTS evidence_image_file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS evidence_image_content_type VARCHAR(255),
  ADD COLUMN IF NOT EXISTS evidence_image_content BYTEA;

ALTER TABLE cob_reports
  ADD COLUMN IF NOT EXISTS stages_evidence_image_file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stages_evidence_image_content_type VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stages_evidence_image_content BYTEA;

CREATE TABLE IF NOT EXISTS company_contacts (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  name VARCHAR(120) NOT NULL,
  surname VARCHAR(120) NOT NULL,
  phone VARCHAR(40),
  email VARCHAR(180)
);

ALTER TABLE company_contacts
  ADD COLUMN IF NOT EXISTS active BOOLEAN;

UPDATE company_contacts
SET active = TRUE
WHERE active IS NULL;

ALTER TABLE company_contacts
  ALTER COLUMN active SET DEFAULT TRUE,
  ALTER COLUMN active SET NOT NULL;

-- Convert legacy report statuses to values accepted by the current enum.
UPDATE cob_reports
SET status = 'COMPLETO'
WHERE status IN ('COMPLETED', 'ARCHIVED');

UPDATE cob_reports
SET status = 'DRAFT'
WHERE status IS NULL;

CREATE TABLE IF NOT EXISTS system_date_time_settings (
  id BIGINT PRIMARY KEY,
  date_format VARCHAR(20) NOT NULL DEFAULT 'dd/MM/yyyy',
  time_format VARCHAR(10) NOT NULL DEFAULT '24h',
  time_zone VARCHAR(80) NOT NULL DEFAULT 'Africa/Maputo',
  locale VARCHAR(20) NOT NULL DEFAULT 'pt-MZ',
  week_starts_on VARCHAR(10) NOT NULL DEFAULT 'MONDAY',
  show_seconds BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT system_date_time_settings_singleton CHECK (id = 1)
);

INSERT INTO system_date_time_settings (
  id, date_format, time_format, time_zone, locale, week_starts_on, show_seconds
)
VALUES (1, 'dd/MM/yyyy', '24h', 'Africa/Maputo', 'pt-MZ', 'MONDAY', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS company_report_headers (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  tagline VARCHAR(300),
  phone VARCHAR(80),
  email VARCHAR(180),
  website VARCHAR(180),
  header_line1 VARCHAR(300),
  header_line2 VARCHAR(300),
  show_header_separator BOOLEAN NOT NULL DEFAULT TRUE,
  footer_text VARCHAR(1000),
  show_footer_separator BOOLEAN NOT NULL DEFAULT TRUE,
  show_page_number BOOLEAN NOT NULL DEFAULT TRUE,
  logo_file_name VARCHAR(255),
  logo_content_type VARCHAR(255),
  logo_content BYTEA
);

CREATE TABLE IF NOT EXISTS company_report_form_templates (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  default_template BOOLEAN NOT NULL DEFAULT FALSE,
  configuration TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_company_report_form_templates_company
  ON company_report_form_templates(company_id);

COMMIT;
