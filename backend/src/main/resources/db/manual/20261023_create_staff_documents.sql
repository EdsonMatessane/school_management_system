CREATE TABLE IF NOT EXISTS staff_document_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    has_validity BOOLEAN NOT NULL DEFAULT FALSE,
    requires_description BOOLEAN NOT NULL DEFAULT FALSE,
    system_type BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_staff_document_types_description_no_validity
        CHECK (NOT requires_description OR NOT has_validity)
);

INSERT INTO staff_document_types (name, has_validity, requires_description, system_type)
SELECT 'NUIT', FALSE, FALSE, TRUE WHERE NOT EXISTS (SELECT 1 FROM staff_document_types WHERE name = 'NUIT');
INSERT INTO staff_document_types (name, has_validity, requires_description, system_type)
SELECT 'BI', TRUE, FALSE, TRUE WHERE NOT EXISTS (SELECT 1 FROM staff_document_types WHERE name = 'BI');
INSERT INTO staff_document_types (name, has_validity, requires_description, system_type)
SELECT 'Certificado', FALSE, FALSE, TRUE WHERE NOT EXISTS (SELECT 1 FROM staff_document_types WHERE name = 'Certificado');
INSERT INTO staff_document_types (name, has_validity, requires_description, system_type)
SELECT 'CV', FALSE, FALSE, TRUE WHERE NOT EXISTS (SELECT 1 FROM staff_document_types WHERE name = 'CV');
INSERT INTO staff_document_types (name, has_validity, requires_description, system_type)
SELECT 'Outro', FALSE, TRUE, TRUE WHERE NOT EXISTS (SELECT 1 FROM staff_document_types WHERE name = 'Outro');

CREATE TABLE IF NOT EXISTS staff_documents (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL REFERENCES staff_members(id) ON DELETE RESTRICT,
    type_id BIGINT NOT NULL REFERENCES staff_document_types(id) ON DELETE RESTRICT,
    description VARCHAR(120),
    issue_date DATE,
    expiry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_staff_documents_dates
        CHECK ((issue_date IS NULL AND expiry_date IS NULL)
               OR (issue_date IS NOT NULL AND expiry_date IS NOT NULL AND expiry_date > issue_date))
);

CREATE INDEX IF NOT EXISTS idx_staff_documents_staff ON staff_documents (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_documents_expiry ON staff_documents (expiry_date);

-- Documentos de BI que já existiam no formulário passam a ser controlados nesta tabela.
INSERT INTO staff_documents (staff_id, type_id, issue_date, expiry_date)
SELECT member.id, type.id, member.issue_date, member.expiry_date
FROM staff_members member
JOIN staff_document_types type ON type.name = 'BI'
WHERE member.issue_date IS NOT NULL
  AND member.expiry_date IS NOT NULL
  AND member.expiry_date > member.issue_date
  AND NOT EXISTS (
      SELECT 1 FROM staff_documents existing
      WHERE existing.staff_id = member.id AND existing.type_id = type.id);
