import {
  Archive,
  ArchiveRestore,
  Eye,
  Pencil,
  Repeat2,
  Trash2,
} from 'lucide-react';
import {
  Chip,
  IconButton,
  MenuItem,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import StandardTable from '../../components/StandardTable';
import {
  formatDateTime,
  priorityColor,
  priorityLabel,
  statuses,
  statusColor,
  statusLabel,
} from './taskUtils';
import { isTeacherMode } from '../../utils/teacherMode';

const columns = [
  { key: 'title', label: 'Tarefa' },
  { key: 'category', label: 'Categoria' },
  { key: 'assignee', label: 'Responsável' },
  { key: 'dueAt', label: 'Prazo' },
  { key: 'priority', label: 'Prioridade' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: 'Ações', align: 'right' },
];

export default function TaskList({
  tasks,
  loading,
  error,
  search,
  filter,
  archived,
  onStatusChange,
  onView,
  onEdit,
  onArchive,
  onDelete,
}) {
  const emptyMessage = error
    ? 'Não foi possível carregar as tarefas.'
    : search.trim() || filter
      ? 'Nenhuma tarefa corresponde aos filtros.'
      : archived
        ? 'Não existem tarefas arquivadas.'
        : 'Ainda não existem tarefas.';

  return (
    <StandardTable
      audit="Task"
      ariaLabel="Lista de tarefas"
      columns={columns}
      loading={loading}
      rows={tasks}
      emptyMessage={emptyMessage}
      renderRow={(task, rowNumber) => (
        <TableRow key={task.id} hover>
          <TableCell>{rowNumber}</TableCell>
          <TableCell>
            <div className="cacoin-task-title-cell">
              <strong>{task.title}</strong>
              {task.recurring && <Repeat2 size={14} aria-label="Tarefa recorrente" />}
              {!!task.tags?.length && (
                <span className="cacoin-task-tags">{task.tags.map((tag) => `#${tag}`).join(' ')}</span>
              )}
            </div>
          </TableCell>
          <TableCell>{task.category || 'Geral'}</TableCell>
          <TableCell>{task.assignee || '—'}</TableCell>
          <TableCell>{formatDateTime(task.dueAt)}</TableCell>
          <TableCell>
            <Chip size="small" color={priorityColor(task.priority)} label={priorityLabel(task.priority)} />
          </TableCell>
          <TableCell>
            {archived ? (
              <Chip size="small" color={statusColor(task.status)} label={statusLabel(task.status)} />
            ) : (
              <TextField
                select
                size="small"
                value={task.status}
                aria-label={`Estado da tarefa ${task.title}`}
                onChange={(event) => onStatusChange(task, event.target.value)}
                sx={{ minWidth: 132 }}
              >
                {statuses.map(({ value, label }) => (
                  <MenuItem key={value} value={value}>{label}</MenuItem>
                ))}
              </TextField>
            )}
          </TableCell>
          <TableCell align="right">
            <Tooltip title="Ver detalhes">
              <IconButton aria-label={`Ver detalhes de ${task.title}`} onClick={() => onView(task)}>
                <Eye size={17} />
              </IconButton>
            </Tooltip>
            {!isTeacherMode() && (
              <>
                {!archived && (
                  <Tooltip title="Editar tarefa">
                  <IconButton
                    className="cacoin-table-action-edit"
                    aria-label={`Editar ${task.title}`}
                    onClick={() => onEdit(task)}
                  >
                    <Pencil size={17} />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={task.archived ? 'Restaurar tarefa' : 'Arquivar tarefa'}>
                <IconButton
                  onClick={() => onArchive(task)}
                  aria-label={`${task.archived ? 'Restaurar' : 'Arquivar'} ${task.title}`}
                >
                  {task.archived ? <ArchiveRestore size={17} /> : <Archive size={17} />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Apagar tarefa">
                <IconButton
                  className="cacoin-table-action-delete"
                  aria-label={`Apagar ${task.title}`}
                  onClick={() => onDelete(task)}
                >
                  <Trash2 size={17} />
                </IconButton>
              </Tooltip>
              </>
            )}
          </TableCell>
        </TableRow>
      )}
    />
  );
}
