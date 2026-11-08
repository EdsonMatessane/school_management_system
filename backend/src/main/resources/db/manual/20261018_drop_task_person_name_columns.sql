-- Passo final da regra "só o ID da pessoa": apaga os nomes em texto das tarefas.
-- Executar só depois de 20261018_task_people_use_ids.sql e de confirmar que nada de importante
-- ficou por converter. Estas consultas mostram os nomes que NÃO coincidiram com nenhum staff
-- (esses ficam sem responsável/criador/autor depois de apagar as colunas):
--
--   SELECT id, assignee, created_by FROM tasks
--    WHERE (btrim(coalesce(assignee, '')) <> '' AND assignee_id IS NULL)
--       OR (btrim(coalesce(created_by, '')) <> '' AND created_by_id IS NULL);
--   SELECT id, task_id, author FROM task_comments
--    WHERE author <> 'Utilizador' AND author_id IS NULL;
--
-- Para os associar à mão: UPDATE tasks SET assignee_id = <id do staff> WHERE id = <id da tarefa>;
ALTER TABLE tasks DROP COLUMN IF EXISTS assignee;
ALTER TABLE tasks DROP COLUMN IF EXISTS created_by;
ALTER TABLE task_comments DROP COLUMN IF EXISTS author;
