-- Regra da base de dados: tabelas ligadas a pessoas guardam apenas o ID da pessoa.
-- internal_expenses.requester_name (nome em texto) passa a requester_id (ID em staff_members).
-- O nome é lido de staff_members. Executar ANTES de arrancar a nova versão do backend. É seguro repetir.
ALTER TABLE internal_expenses ADD COLUMN IF NOT EXISTS requester_id BIGINT;

-- Converte os nomes já guardados quando coincidem com exactamente um membro do staff.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'internal_expenses' AND column_name = 'requester_name') THEN
        UPDATE internal_expenses e
           SET requester_id = (SELECT MIN(s.id) FROM staff_members s
                                WHERE upper(btrim(concat_ws(' ', s.first_name, s.surname)))
                                    = upper(btrim(e.requester_name)))
         WHERE e.requester_id IS NULL AND btrim(coalesce(e.requester_name, '')) <> ''
           AND (SELECT COUNT(*) FROM staff_members s
                 WHERE upper(btrim(concat_ws(' ', s.first_name, s.surname)))
                     = upper(btrim(e.requester_name))) = 1;
        -- A nova versão já não preenche esta coluna.
        ALTER TABLE internal_expenses ALTER COLUMN requester_name DROP NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_internal_expenses_requester_staff') THEN
        ALTER TABLE internal_expenses ADD CONSTRAINT fk_internal_expenses_requester_staff
            FOREIGN KEY (requester_id) REFERENCES staff_members (id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_internal_expenses_requester ON internal_expenses (requester_id);

-- Despesas antigas cujo nome não coincidiu com um único membro do staff ficam sem solicitante.
-- Para as ver:  SELECT id, reference, requester_name FROM internal_expenses WHERE requester_id IS NULL;
-- Para corrigir: UPDATE internal_expenses SET requester_id = <ID do staff> WHERE id = <ID da despesa>;
-- Depois de confirmar que não sobra nenhuma, a coluna antiga pode ser removida:
--   ALTER TABLE internal_expenses DROP COLUMN requester_name;
