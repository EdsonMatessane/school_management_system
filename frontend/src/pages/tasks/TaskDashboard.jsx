import { useEffect, useMemo, useState } from 'react';
import { richTextToPlain } from '../../utils/richText';
import {
  Alert,
  Button,
  Chip,
  MenuItem,
  TextField,
} from '@mui/material';
import {
  Archive,
  Ban,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Clock3,
  ClipboardList,
} from 'lucide-react';
import { getTasks, setTaskStatus } from '../../services/api';
import {
  errorMessage,
  formatDateTime,
  priorityColor,
  priorityLabel,
  statusColor,
  statusLabel,
  statuses,
} from './taskUtils';

const statusDestinations = {
  TODO: 'tasks-todo',
  IN_PROGRESS: 'tasks-in-progress',
  BLOCKED: 'tasks-blocked',
  DONE: 'tasks-done',
};

function localDate(value) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function getToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function getDueDate(task) {
  return localDate(task.dueAt);
}

function isOpen(task) {
  return !task.archived && task.status !== 'DONE';
}

export default function TaskDashboard({ onNavigate }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [movingTaskId, setMovingTaskId] = useState(null);

  useEffect(() => {
    let mounted = true;
    getTasks()
      .then((result) => {
        if (mounted) setTasks(result);
      })
      .catch((loadError) => {
        if (mounted) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const moveTask = async (task, nextStatus) => {
    if (!task || task.status === nextStatus || movingTaskId === task.id) return;
    setMovingTaskId(task.id);
    setError('');
    try {
      const updated = await setTaskStatus(task.id, nextStatus);
      setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (moveError) {
      setError(errorMessage(moveError));
    } finally {
      setMovingTaskId(null);
    }
  };

  const handleDrop = (event, status) => {
    event.preventDefault();
    const taskId = Number(event.dataTransfer.getData('text/plain'));
    const task = tasks.find((item) => item.id === taskId);
    if (task) moveTask(task, status);
  };

  const metrics = useMemo(() => {
    const activeTasks = tasks.filter((task) => !task.archived);
    const openTasks = activeTasks.filter(isOpen);
    const today = getToday();
    const overdueTasks = openTasks.filter((task) => {
      const due = getDueDate(task);
      return due && due < today;
    });
    const dueTodayTasks = openTasks.filter((task) => {
      const due = getDueDate(task);
      return due && due.getTime() === today.getTime();
    });
    const dueSoonTasks = openTasks.filter((task) => {
      const due = getDueDate(task);
      if (!due) return false;
      const daysUntilDue = (due - today) / 86_400_000;
      return daysUntilDue >= 0 && daysUntilDue <= 7;
    });
    return {
      active: activeTasks.length,
      todo: activeTasks.filter((task) => task.status === 'TODO').length,
      inProgress: activeTasks.filter((task) => task.status === 'IN_PROGRESS').length,
      blocked: activeTasks.filter((task) => task.status === 'BLOCKED').length,
      done: activeTasks.filter((task) => task.status === 'DONE').length,
      archived: tasks.filter((task) => task.archived).length,
      overdue: overdueTasks.length,
      dueToday: dueTodayTasks.length,
      dueSoon: dueSoonTasks.length,
      upcoming: openTasks
        .filter((task) => getDueDate(task) >= today)
        .sort((left, right) => getDueDate(left) - getDueDate(right))
        .slice(0, 6),
    };
  }, [tasks]);

  const cards = [
    { label: 'Tarefas activas', value: metrics.active, icon: ClipboardList, view: 'tasks' },
    { label: 'Por fazer', value: metrics.todo, icon: CircleDashed, view: 'tasks-todo' },
    { label: 'Em progresso', value: metrics.inProgress, icon: Clock3, view: 'tasks-in-progress' },
    { label: 'Bloqueadas', value: metrics.blocked, icon: Ban, view: 'tasks-blocked' },
    { label: 'Concluídas', value: metrics.done, icon: CheckCircle2, view: 'tasks-done' },
    { label: 'Arquivadas', value: metrics.archived, icon: Archive, view: 'tasks-archived' },
  ];

  return (
    <section className="cacoin-course-page cacoin-tasks-page cacoin-task-dashboard">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Gestão de tarefas</p>
          <h1>Dashboard</h1>
        </div>
        <Button variant="contained" onClick={() => onNavigate('tasks')}>
          Ver todas as tarefas
        </Button>
      </header>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <div className="cacoin-task-dashboard-cards">
        {cards.map(({ label, value, icon: Icon, view }) => (
          <button
            className="cacoin-task-dashboard-card"
            key={label}
            type="button"
            onClick={() => onNavigate(view)}
            disabled={loading}
          >
            <span className="cacoin-task-dashboard-card-icon"><Icon size={20} aria-hidden="true" /></span>
            <span className="cacoin-task-dashboard-card-label">{label}</span>
            <strong>{loading ? '—' : value}</strong>
          </button>
        ))}
      </div>

      <section className="cacoin-task-kanban" aria-label="Quadro Kanban das tarefas">
        <header className="cacoin-task-kanban-heading">
          <div>
            <h2>Quadro Kanban</h2>
            <p>Arraste tarefas entre colunas ou altere o estado no cartão.</p>
          </div>
        </header>
        <div className="cacoin-task-kanban-columns">
          {statuses.map(({ value: status, label }) => {
            const columnTasks = tasks.filter((task) => !task.archived && task.status === status);
            return (
              <section
                key={status}
                className={`cacoin-task-kanban-column status-${status.toLowerCase().replace('_', '-')}`}
                aria-label={`${label}: ${columnTasks.length} tarefas`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(event, status)}
              >
                <header>
                  <span>{label}</span>
                  <Chip size="small" label={columnTasks.length} />
                </header>
                <div className="cacoin-task-kanban-cards">
                  {!loading && columnTasks.length === 0 && (
                    <p className="cacoin-task-kanban-empty">Sem tarefas</p>
                  )}
                  {columnTasks.map((task) => (
                    <article
                      key={task.id}
                      className="cacoin-task-kanban-card"
                      draggable={movingTaskId !== task.id}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', String(task.id));
                      }}
                    >
                      <button
                        type="button"
                        className="cacoin-task-kanban-card-title"
                        onClick={() => onNavigate(statusDestinations[task.status] ?? 'tasks')}
                        title="Abrir lista deste estado"
                      >
                        {task.title}
                      </button>
                      {richTextToPlain(task.description) && <p>{richTextToPlain(task.description)}</p>}
                      <div className="cacoin-task-kanban-card-meta">
                        <Chip
                          size="small"
                          color={priorityColor(task.priority)}
                          label={priorityLabel(task.priority)}
                        />
                        {task.dueAt && <time>{formatDateTime(task.dueAt)}</time>}
                      </div>
                      <div className="cacoin-task-kanban-card-footer">
                        <span>{task.assignee || task.category || 'Sem responsável'}</span>
                        <TextField
                          select
                          size="small"
                          value={task.status}
                          disabled={movingTaskId === task.id}
                          aria-label={`Mover ${task.title} para outro estado`}
                          onChange={(event) => moveTask(task, event.target.value)}
                        >
                          {statuses.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <div className="cacoin-task-dashboard-panels">
        <section className="cacoin-task-dashboard-panel">
          <header>
            <div>
              <h2>Prazos próximos</h2>
              <p>Tarefas abertas com prazo nos próximos sete dias.</p>
            </div>
            <CalendarClock size={20} aria-hidden="true" />
          </header>
          <div className="cacoin-task-dashboard-deadlines">
            {!loading && metrics.upcoming.length === 0 && (
              <p className="cacoin-task-muted">Não há tarefas com prazo próximo.</p>
            )}
            {metrics.upcoming.map((task) => (
              <button
                key={task.id}
                type="button"
                className="cacoin-task-dashboard-deadline"
                onClick={() => onNavigate(statusDestinations[task.status] ?? 'tasks')}
              >
                <span>
                  <strong>{task.title}</strong>
                  <small>{task.assignee || task.category || 'Sem responsável'}</small>
                </span>
                <span className="cacoin-task-dashboard-deadline-meta">
                  <Chip size="small" color={statusColor(task.status)} label={statusLabel(task.status)} />
                  <time>{formatDateTime(task.dueAt)}</time>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="cacoin-task-dashboard-panel cacoin-task-dashboard-summary">
          <header>
            <div>
              <h2>Resumo de prazos</h2>
              <p>Acompanhamento das tarefas por data de conclusão.</p>
            </div>
            <CalendarClock size={20} aria-hidden="true" />
          </header>
          <button type="button" onClick={() => onNavigate('tasks')}>
            <span>Em atraso</span><strong>{loading ? '—' : metrics.overdue}</strong>
          </button>
          <button type="button" onClick={() => onNavigate('tasks')}>
            <span>Com prazo hoje</span><strong>{loading ? '—' : metrics.dueToday}</strong>
          </button>
          <button type="button" onClick={() => onNavigate('tasks')}>
            <span>Nos próximos 7 dias</span><strong>{loading ? '—' : metrics.dueSoon}</strong>
          </button>
        </section>
      </div>
    </section>
  );
}
