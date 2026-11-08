import { useState } from 'react';
import { CheckSquare, MessageCircle } from 'lucide-react';
import { RichTextViewer } from '../../components/RichTextEditor';
import { richTextToPlain } from '../../utils/richText';
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
} from '@mui/material';
import {
  formatDateTime,
  priorityColor,
  priorityLabel,
  recurrenceOptions,
  statusColor,
  statusLabel,
} from './taskUtils';
import { isTeacherMode } from '../../utils/teacherMode';

export default function TaskDetailsDialog({
  task,
  error,
  saving,
  onClose,
  onChecklistChange,
  onAddComment,
  onRemoveComment,
}) {
  const [commentText, setCommentText] = useState('');

  const submitComment = async (event) => {
    event.preventDefault();
    if (!commentText.trim()) return;
    const saved = await onAddComment(commentText.trim());
    if (saved) setCommentText('');
  };

  return (
    <Dialog open={Boolean(task)} onClose={onClose} fullWidth maxWidth="md">
      {task && (
        <>
          <DialogTitle className="cacoin-task-details-title">
            <span>{task.title}</span>
            <div>
              <Chip size="small" color={statusColor(task.status)} label={statusLabel(task.status)} />
              <Chip size="small" color={priorityColor(task.priority)} label={priorityLabel(task.priority)} />
            </div>
          </DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
            <dl className="cacoin-task-details-grid">
              <div><dt>Categoria</dt><dd>{task.category || 'Geral'}</dd></div>
              <div><dt>Responsável</dt><dd>{task.assignee || '—'}</dd></div>
              <div><dt>Início</dt><dd>{formatDateTime(task.startAt)}</dd></div>
              <div><dt>Prazo</dt><dd>{formatDateTime(task.dueAt)}</dd></div>
              <div><dt>Criada por</dt><dd>{task.createdBy || '—'}</dd></div>
              <div>
                <dt>Recorrência</dt>
                <dd>{task.recurring
                  ? recurrenceOptions.find(({ value }) => value === task.recurrenceRule)?.label ?? 'Sim'
                  : 'Não'}</dd>
              </div>
            </dl>
            <h3 className="cacoin-task-section-title">Descrição</h3>
            {richTextToPlain(task.description)
              ? <RichTextViewer value={task.description} />
              : <p className="cacoin-task-description">Sem descrição.</p>}
            {!!task.tags?.length && (
              <div className="cacoin-task-detail-tags">
                {task.tags.map((tag) => <Chip key={tag} size="small" label={tag} />)}
              </div>
            )}
            <h3 className="cacoin-task-section-title">
              <CheckSquare size={17} aria-hidden="true" /> Lista de verificação
            </h3>
            {task.checklist?.length ? task.checklist.map((item) => (
              <FormControlLabel
                key={item.id}
                control={(
                  <Checkbox
                    checked={item.completed}
                    disabled={isTeacherMode()}
                    onChange={(event) => onChecklistChange(
                      task.checklist.map((entry) => (
                        entry.id === item.id ? { ...entry, completed: event.target.checked } : entry
                      )),
                    )}
                  />
                )}
                label={item.title}
              />
            )) : <p className="cacoin-task-muted">Sem itens de verificação.</p>}

            <h3 className="cacoin-task-section-title">
              <MessageCircle size={17} aria-hidden="true" /> Comentários
            </h3>
            <div className="cacoin-task-comments">
              {task.comments?.length ? task.comments.map((comment) => (
                <article key={comment.id} className="cacoin-task-comment">
                  <div>
                    <strong>{comment.author}</strong>
                    <time>{formatDateTime(comment.createdAt)}</time>
                  </div>
                  <p>{comment.content}</p>
                  {!isTeacherMode() && (
                    <Button color="error" size="small" onClick={() => onRemoveComment(comment)}>
                      Remover
                    </Button>
                  )}
                </article>
              )) : <p className="cacoin-task-muted">Ainda não existem comentários.</p>}
            </div>
            <form className="cacoin-task-comment-form" onSubmit={submitComment}>
              <TextField
                fullWidth
                size="small"
                label="Escrever comentário"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
              />
              <Button type="submit" variant="contained" disabled={saving || !commentText.trim()}>
                Enviar
              </Button>
            </form>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose}>Fechar</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
