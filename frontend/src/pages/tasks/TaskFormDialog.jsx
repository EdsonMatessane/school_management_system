import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Alert,
  Autocomplete,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  TextField,
} from '@mui/material';
import RichTextField from '../../components/RichTextField';
import { getTaskMe, getTaskPeople } from '../../services/api';
import { richTextToPlain } from '../../utils/richText';
import {
  maskTaskDate,
  parseDateTime,
  priorities,
  recurrenceOptions,
  statuses,
  toDateTimeInputs,
} from './taskUtils';

const emptyForm = {
  title: '',
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  category: 'Geral',
  assigneeId: '',
  createdById: '',
  startDate: '',
  startTime: '',
  dueDate: '',
  dueTime: '',
  recurring: false,
  recurrenceRule: 'WEEKLY',
  tagsText: '',
  checklist: [],
};

function getInitialForm(task) {
  if (!task) return emptyForm;
  const start = toDateTimeInputs(task.startAt);
  const due = toDateTimeInputs(task.dueAt);
  return {
    ...emptyForm,
    title: task.title ?? '',
    description: task.description ?? '',
    status: task.status ?? 'TODO',
    priority: task.priority ?? 'MEDIUM',
    category: task.category ?? 'Geral',
    assigneeId: task.assigneeId != null ? String(task.assigneeId) : '',
    createdById: task.createdById != null ? String(task.createdById) : '',
    startDate: start.date,
    startTime: start.time,
    dueDate: due.date,
    dueTime: due.time,
    recurring: Boolean(task.recurring),
    recurrenceRule: task.recurrenceRule || 'WEEKLY',
    tagsText: (task.tags ?? []).join(', '),
    checklist: task.checklist ?? [],
  };
}

// Mantém visível a pessoa já guardada na tarefa mesmo que entretanto tenha ficado inactiva.
const withCurrentPerson = (people, id, name) => (
  id != null && !people.some((person) => person.id === id)
    ? [...people, { id, name: name || `#${id}` }]
    : people
);

export default function TaskFormDialog({ open, task, saving, error, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const [checklistInput, setChecklistInput] = useState('');
  const [validationError, setValidationError] = useState('');
  const [people, setPeople] = useState([]);
  const [me, setMe] = useState(null);
  const [editorKey, setEditorKey] = useState(0);

  // Pessoas escolhíveis (staff activo): a tarefa guarda apenas o ID da pessoa escolhida.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    getTaskPeople()
      .then((result) => { if (!cancelled) setPeople(result); })
      .catch(() => { if (!cancelled) setPeople([]); });
    getTaskMe()
      .then((result) => { if (!cancelled) setMe(result); })
      .catch(() => { if (!cancelled) setMe(null); });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (open) {
      setForm(getInitialForm(task));
      setEditorKey((current) => current + 1);
      setChecklistInput('');
      setValidationError('');
    }
  }, [open, task]);

  const addChecklistItem = () => {
    const title = checklistInput.trim();
    if (!title) return;
    setForm((current) => ({
      ...current,
      checklist: [...current.checklist, { id: null, title, completed: false }],
    }));
    setChecklistInput('');
  };

  const submit = async (event) => {
    event.preventDefault();
    const start = parseDateTime(form.startDate, form.startTime, 'início');
    const due = parseDateTime(form.dueDate, form.dueTime, 'prazo');
    if (start.error || due.error) {
      setValidationError(start.error || due.error);
      return;
    }
    if (start.value && due.value && due.value < start.value) {
      setValidationError('O prazo não pode ser anterior à data de início.');
      return;
    }
    setValidationError('');
    await onSave({
      title: form.title.trim(),
      description: richTextToPlain(form.description) ? form.description.trim() : '',
      status: form.status,
      priority: form.priority,
      category: form.category.trim() || 'Geral',
      assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
      createdById: form.createdById ? Number(form.createdById) : null,
      startAt: start.value,
      dueAt: due.value,
      recurring: form.recurring,
      recurrenceRule: form.recurring ? form.recurrenceRule : '',
      tags: form.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean),
      checklist: form.checklist
        .filter((item) => item.title.trim())
        .map(({ id, title: itemTitle, completed }) => ({
          id,
          title: itemTitle.trim(),
          completed,
        })),
    });
  };

  const updateField = (field) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [field]: value }));
    setValidationError('');
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth="md">
      <form onSubmit={submit}>
        <DialogTitle>{task ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
        <DialogContent>
          {(validationError || error) && (
            <Alert severity="error" sx={{ mt: 1 }}>{validationError || error}</Alert>
          )}
          <div className="cacoin-task-form-grid">
            <TextField
              autoFocus
              required
              fullWidth
              size="small"
              label="Título"
              value={form.title}
              onChange={updateField('title')}
              slotProps={{ htmlInput: { maxLength: 180 } }}
            />
            <TextField
              fullWidth
              size="small"
              label="Categoria"
              value={form.category}
              onChange={updateField('category')}
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
            <TextField
              select
              fullWidth
              size="small"
              label="Prioridade"
              value={form.priority}
              onChange={updateField('priority')}
            >
              {priorities.map(({ value, label }) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              size="small"
              label="Estado"
              value={statuses.find(({ value }) => value === form.status)?.label ?? ''}
              slotProps={{ input: { readOnly: true } }}
            />
            <Autocomplete
              fullWidth
              size="small"
              options={withCurrentPerson(people, task?.assigneeId, task?.assignee)}
              value={withCurrentPerson(people, task?.assigneeId, task?.assignee)
                .find((person) => String(person.id) === form.assigneeId) ?? null}
              getOptionLabel={(person) => person.name ?? ''}
              isOptionEqualToValue={(option, selected) => option.id === selected.id}
              onChange={(_, person) => setForm((current) => ({
                ...current,
                assigneeId: person ? String(person.id) : '',
              }))}
              noOptionsText="Sem pessoas disponíveis"
              renderInput={(params) => <TextField {...params} label="Responsável" size="small" />}
            />
            <TextField
              fullWidth
              size="small"
              label="Criada por"
              value={task ? (task.createdBy ?? '') : (me?.name ?? '')}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              fullWidth
              size="small"
              label="Início (DD/MM/AAAA)"
              placeholder="DD/MM/AAAA"
              value={form.startDate}
              onChange={(event) => setForm((current) => ({
                ...current,
                startDate: maskTaskDate(event.target.value),
              }))}
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }}
            />
            <TextField
              fullWidth
              size="small"
              label="Hora de início"
              placeholder="HH:mm"
              value={form.startTime}
              onChange={(event) => setForm((current) => ({
                ...current,
                startTime: event.target.value.replace(/[^\d:]/g, '').slice(0, 5),
              }))}
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 5 } }}
            />
            <TextField
              fullWidth
              size="small"
              label="Prazo (DD/MM/AAAA)"
              placeholder="DD/MM/AAAA"
              value={form.dueDate}
              onChange={(event) => setForm((current) => ({
                ...current,
                dueDate: maskTaskDate(event.target.value),
              }))}
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }}
            />
            <TextField
              fullWidth
              size="small"
              label="Hora do prazo"
              placeholder="HH:mm"
              value={form.dueTime}
              onChange={(event) => setForm((current) => ({
                ...current,
                dueTime: event.target.value.replace(/[^\d:]/g, '').slice(0, 5),
              }))}
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 5 } }}
            />
            <TextField
              fullWidth
              size="small"
              label="Etiquetas"
              value={form.tagsText}
              onChange={updateField('tagsText')}
              helperText="Separe as etiquetas por vírgulas."
            />
            <FormControl className="cacoin-task-recurring">
              <FormControlLabel
                control={(
                  <Checkbox
                    checked={form.recurring}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      recurring: event.target.checked,
                    }))}
                  />
                )}
                label="Tarefa recorrente"
              />
            </FormControl>
            {form.recurring && (
              <TextField
                select
                fullWidth
                size="small"
                label="Repetição"
                value={form.recurrenceRule}
                onChange={updateField('recurrenceRule')}
              >
                {recurrenceOptions.map(({ value, label }) => (
                  <MenuItem key={value} value={value}>{label}</MenuItem>
                ))}
              </TextField>
            )}
            <RichTextField
              label="Descrição"
              value={form.description}
              resetKey={editorKey}
              onChange={(description) => setForm((current) => ({ ...current, description }))}
            />
            <section className="cacoin-task-checklist-editor">
              <h3>Lista de verificação</h3>
              <div className="cacoin-task-checklist-add">
                <TextField
                  fullWidth
                  size="small"
                  label="Novo item"
                  value={checklistInput}
                  onChange={(event) => setChecklistInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addChecklistItem();
                    }
                  }}
                />
                <Button type="button" variant="outlined" onClick={addChecklistItem}>Adicionar</Button>
              </div>
              {form.checklist.map((item, index) => (
                <div className="cacoin-task-checklist-row" key={item.id ?? `new-${index}`}>
                  <Checkbox
                    checked={item.completed}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      checklist: current.checklist.map((entry, entryIndex) => (
                        entryIndex === index ? { ...entry, completed: event.target.checked } : entry
                      )),
                    }))}
                    slotProps={{ input: { 'aria-label': `Concluir ${item.title}` } }}
                  />
                  <span>{item.title}</span>
                  <IconButton
                    aria-label={`Remover item ${item.title}`}
                    onClick={() => setForm((current) => ({
                      ...current,
                      checklist: current.checklist.filter((_, entryIndex) => entryIndex !== index),
                    }))}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              ))}
            </section>
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={saving || !form.title.trim()}>
            {task ? 'Guardar alterações' : 'Criar tarefa'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
