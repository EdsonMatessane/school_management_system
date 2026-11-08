import { useCallback, useEffect, useMemo, useState } from 'react';
import { richTextToPlain } from '../../utils/richText';
import { Archive, Plus } from 'lucide-react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import SearchField from '../../components/SearchField';
import DataExportMenu from '../../components/DataExportMenu';
import {
  addTaskComment,
  createTask,
  deleteTask,
  deleteTaskComment,
  getTasks,
  setTaskArchived,
  setTaskStatus,
  updateTask,
} from '../../services/api';
import { filterBySearch } from '../../utils/search';
import TaskDetailsDialog from './TaskDetailsDialog';
import TaskFormDialog from './TaskFormDialog';
import TaskList from './TaskList';
import {
  errorMessage,
  formatDateTime,
  priorities,
  priorityLabel,
  statusLabel,
} from './taskUtils';
import { isTeacherMode } from '../../utils/teacherMode';

const statusViews = {
  todo: 'TODO',
  'in-progress': 'IN_PROGRESS',
  blocked: 'BLOCKED',
  done: 'DONE',
};

const viewTitles = {
  all: 'Todas as tarefas',
  todo: 'Tarefas por fazer',
  'in-progress': 'Tarefas em progresso',
  blocked: 'Tarefas bloqueadas',
  done: 'Tarefas concluídas',
  archived: 'Tarefas arquivadas',
};

export default function TasksManagement({ view = 'all' }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [detailsTask, setDetailsTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);

  const archived = view === 'archived';
  const statusFilter = statusViews[view] ?? '';

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setTasks(await getTasks());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    setSearch('');
    setPriorityFilter('');
  }, [view]);

  const filteredTasks = useMemo(() => {
    const visible = tasks.filter((task) => task.archived === archived);
    const byStatus = statusFilter
      ? visible.filter((task) => task.status === statusFilter)
      : visible;
    const byPriority = priorityFilter
      ? byStatus.filter((task) => task.priority === priorityFilter)
      : byStatus;
    return filterBySearch(byPriority, search, (task) => [
      task.title,
      richTextToPlain(task.description),
      task.category,
      task.assignee,
      task.createdBy,
      ...(task.tags ?? []),
      statusLabel(task.status),
      priorityLabel(task.priority),
    ]);
  }, [archived, priorityFilter, search, statusFilter, tasks]);
  const exportColumns = [
    { key: 'title', label: 'Tarefa' },
    { key: 'category', label: 'Categoria' },
    { key: 'assignee', label: 'Responsável' },
    { key: 'dueAt', label: 'Prazo' },
    { key: 'priority', label: 'Prioridade' },
    { key: 'status', label: 'Estado' },
    { key: 'tags', label: 'Etiquetas' },
  ];
  const exportRows = filteredTasks.map((task) => ({
    title: task.title,
    category: task.category || 'Geral',
    assignee: task.assignee || '—',
    dueAt: formatDateTime(task.dueAt),
    priority: priorityLabel(task.priority),
    status: statusLabel(task.status),
    tags: (task.tags ?? []).map((tag) => `#${tag}`).join(' '),
  }));

  const saveTask = async (payload) => {
    setSaving(true);
    setError('');
    try {
      if (editingTask) {
        await updateTask(editingTask.id, payload);
        setNotice('A tarefa foi atualizada.');
      } else {
        await createTask(payload);
        setNotice('A tarefa foi criada.');
      }
      setDialogOpen(false);
      await loadTasks();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (task, status) => {
    setError('');
    setNotice('');
    try {
      const updated = await setTaskStatus(task.id, status);
      setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setNotice(`Estado atualizado: ${statusLabel(status).toLowerCase()}.`);
      if (detailsTask?.id === task.id) setDetailsTask(updated);
    } catch (actionError) {
      setError(errorMessage(actionError));
    }
  };

  const toggleArchive = async (task) => {
    setError('');
    setNotice('');
    try {
      const updated = await setTaskArchived(task.id, !task.archived);
      setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setNotice(task.archived ? 'A tarefa foi restaurada.' : 'A tarefa foi arquivada.');
      if (detailsTask?.id === task.id) setDetailsTask(null);
    } catch (actionError) {
      setError(errorMessage(actionError));
    }
  };

  const confirmDelete = async () => {
    if (!deletingTask) return;
    setSaving(true);
    setError('');
    try {
      await deleteTask(deletingTask.id);
      setNotice('A tarefa foi apagada.');
      setDeletingTask(null);
      if (detailsTask?.id === deletingTask.id) setDetailsTask(null);
      await loadTasks();
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  const saveChecklistChange = async (checklist) => {
    if (!detailsTask) return;
    setError('');
    try {
      const updated = await updateTask(detailsTask.id, {
        ...detailsTask,
        startAt: detailsTask.startAt || null,
        dueAt: detailsTask.dueAt || null,
        tags: detailsTask.tags ?? [],
        checklist,
      });
      setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
      setDetailsTask(updated);
    } catch (actionError) {
      setError(errorMessage(actionError));
    }
  };

  const submitComment = async (content) => {
    if (!detailsTask) return false;
    setSaving(true);
    setError('');
    try {
      const updated = await addTaskComment(detailsTask.id, { content });
      setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
      setDetailsTask(updated);
      return true;
    } catch (commentError) {
      setError(errorMessage(commentError));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const removeComment = async (comment) => {
    if (!detailsTask) return;
    setError('');
    try {
      const updated = await deleteTaskComment(detailsTask.id, comment.id);
      setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
      setDetailsTask(updated);
    } catch (commentError) {
      setError(errorMessage(commentError));
    }
  };

  const openCreateDialog = () => {
    setEditingTask(null);
    setError('');
    setNotice('');
    setDialogOpen(true);
  };

  const openEditDialog = (task) => {
    setEditingTask(task);
    setError('');
    setNotice('');
    setDialogOpen(true);
  };

  return (
    <section className="cacoin-course-page cacoin-tasks-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Gestão de tarefas</p>
          <h1>{viewTitles[view] ?? viewTitles.all}</h1>
        </div>
        <div className="cacoin-page-heading-actions cacoin-tasks-toolbar">
          <SearchField value={search} onChange={setSearch} />
          <TextField
            select
            size="small"
            label="Prioridade"
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">Todas as prioridades</MenuItem>
            {priorities.map(({ value, label }) => (
              <MenuItem key={value} value={value}>{label}</MenuItem>
            ))}
          </TextField>
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename={`tarefas-${view}`}
            title={viewTitles[view] ?? viewTitles.all}
            disabled={loading}
            onError={(exportError) => setError(exportError.message)}
          />
          {archived ? (
            <Button variant="outlined" startIcon={<Archive size={17} />} disabled>
              Arquivo
            </Button>
          ) : !isTeacherMode() && (
            <Button variant="contained" startIcon={<Plus size={17} />} onClick={openCreateDialog}>
              Nova tarefa
            </Button>
          )}
        </div>
      </header>

      {error && !dialogOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>
      )}

      <TaskList
        tasks={filteredTasks}
        loading={loading}
        error={error}
        search={search}
        filter={priorityFilter}
        archived={archived}
        onStatusChange={changeStatus}
        onView={setDetailsTask}
        onEdit={openEditDialog}
        onArchive={toggleArchive}
        onDelete={setDeletingTask}
      />

      <TaskFormDialog
        open={dialogOpen}
        task={editingTask}
        saving={saving}
        error={error}
        onClose={() => setDialogOpen(false)}
        onSave={saveTask}
      />

      <TaskDetailsDialog
        task={detailsTask}
        error={error}
        saving={saving}
        onClose={() => setDetailsTask(null)}
        onChecklistChange={saveChecklistChange}
        onAddComment={submitComment}
        onRemoveComment={removeComment}
      />

      <Dialog
        open={Boolean(deletingTask)}
        onClose={() => !saving && setDeletingTask(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Apagar tarefa</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mt: 1, mb: 1 }}>{error}</Alert>}
          Tem a certeza de que pretende apagar a tarefa “{deletingTask?.title}”?
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeletingTask(null)} disabled={saving}>Cancelar</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={saving}>
            Apagar
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
