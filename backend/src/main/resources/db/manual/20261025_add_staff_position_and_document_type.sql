-- Cargo e tipo de documento de identificação do funcionário.
-- position_id      -> finance_positions (Definições > Cargos)
-- document_type_id -> staff_document_types (tipos de documento; por omissão BI)
-- Aplicar depois de 20261023_create_staff_documents.sql e 20261024_create_finance.sql.

ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS document_type_id BIGINT;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS position_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_staff_members_document_type') THEN
        ALTER TABLE staff_members
            ADD CONSTRAINT fk_staff_members_document_type
            FOREIGN KEY (document_type_id) REFERENCES staff_document_types (id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_staff_members_position') THEN
        ALTER TABLE staff_members
            ADD CONSTRAINT fk_staff_members_position
            FOREIGN KEY (position_id) REFERENCES finance_positions (id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_staff_members_document_type ON staff_members (document_type_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_position ON staff_members (position_id);

-- O número do documento deixa de ser só BI (13 caracteres): passa a aceitar até 20.
ALTER TABLE staff_members ALTER COLUMN bi_number TYPE VARCHAR(20);

-- Funcionários existentes ficam com o tipo BI (o tipo por omissão).
UPDATE staff_members
SET document_type_id = (SELECT id FROM staff_document_types WHERE name = 'BI' LIMIT 1)
WHERE document_type_id IS NULL;
