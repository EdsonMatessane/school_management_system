-- Regra da base de dados: tabelas ligadas a pessoas guardam apenas o ID da pessoa.
-- tasks.assignee / tasks.created_by / task_comments.author (nomes em texto) passam a
-- assignee_id / created_by_id / author_id (ID em staff_members). O nome é lido de staff_members.
-- Executar ANTES de arrancar a nova versão do backend. É seguro repetir.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id BIGINT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_id BIGINT;
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS author_id BIGINT;

-- Converte os nomes já guardados quando coincidem com exactamente um membro do staff.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'tasks' AND column_name = 'assignee') THEN
        UPDATE tasks t
           SET assignee_id = (SELECT MIN(s.id) FROM staff_members s
                               WHERE upper(btrim(concat_ws(' ', s.first_name, s.surname)))
                                   = upper(btrim(t.assignee)))
         WHERE t.assignee_id IS NULL AND btrim(coalesce(t.assignee, '')) <> ''
           AND (SELECT COUNT(*) FROM staff_members s
                 WHERE upper(btrim(concat_ws(' ', s.first_name, s.surname)))
                     = upper(btrim(t.assignee))) = 1;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'tasks' AND column_name = 'created_by') THEN
        UPDATE tasks t
           SET created_by_id = (SELECT MIN(s.id) FROM staff_members s
                                 WHERE upper(btrim(concat_ws(' ', s.first_name, s.surname)))
                                     = upper(btrim(t.created_by)))
         WHERE t.created_by_id IS NULL AND btrim(coalesce(t.created_by, '')) <> ''
           AND (SELECT COUNT(*) FROM staff_members s
                 WHERE upper(btrim(concat_ws(' ', s.first_name, s.surname)))
                     = upper(btrim(t.created_by))) = 1;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'task_comments' AND column_name = 'author') THEN
        UPDATE task_comments c
           SET author_id = (SELECT MIN(s.id) FROM staff_members s
                             WHERE upper(btrim(concat_ws(' ', s.first_name, s.surname)))
                                 = upper(btrim(c.author)))
         WHERE c.author_id IS NULL AND btrim(coalesce(c.author, '')) <> ''
           AND (SELECT COUNT(*) FROM staff_members s
                 WHERE upper(btrim(concat_ws(' ', s.first_name, s.surname)))
                     = upper(btrim(c.author))) = 1;
        -- A nova versão já não preenche esta coluna.
        ALTER TABLE task_comments ALTER COLUMN author DROP NOT NULL;
    END IF;
END $$;

-- Ligações aos membros do staff (se o staff for apagado, o campo fica vazio).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tasks_assignee_staff') THEN
        ALTER TABLE tasks ADD CONSTRAINT fk_tasks_assignee_staff
            FOREIGN KEY (assignee_id) REFERENCES staff_members (id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tasks_created_by_staff') THEN
        ALTER TABLE tasks ADD CONSTRAINT fk_tasks_created_by_staff
            FOREIGN KEY (created_by_id) REFERENCES staff_members (id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_task_comments_author_staff') THEN
        ALTER TABLE task_comments ADD CONSTRAINT fk_task_comments_author_staff
            FOREIGN KEY (author_id) REFERENCES staff_members (id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks (assignee_id);
