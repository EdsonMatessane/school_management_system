import { useCallback, useEffect, useState } from 'react';
import {
  BadgeDollarSign,
  CalendarClock,
  CircleCheck,
  Clock3,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  Radio,
  RadioGroup,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import SettingsFormDialog from '../../../components/SettingsFormDialog';
import SettingsValuesTable from '../../../components/SettingsValuesTable';
import StandardTable from '../../../components/StandardTable';
import Money from '../../../components/Money';
import {
  deleteExamFee,
  getExamSettings,
  updateExamFee,
  updateExamSettings,
} from '../../../services/api';
import { maskDate, parseDisplayDate, toDisplayDate } from '../../../utils/date';
import StatusSettingsTable from '../../../components/StatusSettingsTable';

const statusGroups = [{ module: 'EXAMS', title: 'Estados' }];

const emptySettings = {
  normalFee: '',
  recurrenceFee: '',
  specialFee: '',
  normalFeeActive: false,
  recurrenceFeeActive: false,
  specialFeeActive: false,
  examPeriodStart: '',
  examPeriodEnd: '',
  gradeReleaseStart: '',
  gradeReleaseEnd: '',
};
const pages = {
  definition: { title: 'Definição', icon: BadgeDollarSign },
  statuses: { title: 'Estados', icon: CircleCheck },
  periods: { title: 'Períodos', icon: CalendarClock },
};
const feeFields = [
  { type: 'NORMAL', name: 'normalFee', activeName: 'normalFeeActive', label: 'Taxa de exame normal' },
  { type: 'RECURRENCE', name: 'recurrenceFee', activeName: 'recurrenceFeeActive', label: 'Taxa de exame de recorrência' },
  { type: 'SPECIAL', name: 'specialFee', activeName: 'specialFeeActive', label: 'Taxa de exame especial' },
];
const periodSections = [
  { title: 'Período de exame', icon: Clock3, start: 'examPeriodStart', end: 'examPeriodEnd' },
  { title: 'Período de lançamento de notas', icon: CalendarClock, start: 'gradeReleaseStart', end: 'gradeReleaseEnd' },
];
const splitDateTime = (value) => {
  const [date = '', time = ''] = String(value ?? '').split(' ');
  return { date, time };
};
const maskTime = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
};
const errorMessage = (error) => (
  error.response?.data?.message
  || error.message
  || 'Não foi possível concluir a operação.'
);
const dateTimeValue = (value) => {
  if (!value) return '';
  const datePart = String(value).slice(0, 10);
  const timePart = String(value).slice(11, 16);
  return `${toDisplayDate(datePart)} ${timePart}`;
};
const parseDateTime = (value) => {
  if (!value) return null;
  const match = /^(\d{2}\/\d{2}\/\d{4}) (\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, displayDate, hours, minutes] = match;
  const date = parseDisplayDate(displayDate);
  if (!date || Number(hours) > 23 || Number(minutes) > 59) return null;
  return `${date}T${hours}:${minutes}:00`;
};
const toForm = (settings) => ({
  normalFee: settings.normalFee == null || Number(settings.normalFee) === 0
    ? ''
    : String(settings.normalFee),
  recurrenceFee: settings.recurrenceFee == null || Number(settings.recurrenceFee) === 0
    ? ''
    : String(settings.recurrenceFee),
  specialFee: settings.specialFee == null || Number(settings.specialFee) === 0
    ? ''
    : String(settings.specialFee),
  normalFeeActive: Boolean(settings.normalFeeActive),
  recurrenceFeeActive: Boolean(settings.recurrenceFeeActive),
  specialFeeActive: Boolean(settings.specialFeeActive),
  examPeriodStart: dateTimeValue(settings.examPeriodStart),
  examPeriodEnd: dateTimeValue(settings.examPeriodEnd),
  gradeReleaseStart: dateTimeValue(settings.gradeReleaseStart),
  gradeReleaseEnd: dateTimeValue(settings.gradeReleaseEnd),
});
const toPayload = (form) => ({
  normalFee: Number(form.normalFee),
  recurrenceFee: Number(form.recurrenceFee),
  specialFee: Number(form.specialFee),
  normalFeeActive: form.normalFeeActive,
  recurrenceFeeActive: form.recurrenceFeeActive,
  specialFeeActive: form.specialFeeActive,
  examPeriodStart: parseDateTime(form.examPeriodStart),
  examPeriodEnd: parseDateTime(form.examPeriodEnd),
  gradeReleaseStart: parseDateTime(form.gradeReleaseStart),
  gradeReleaseEnd: parseDateTime(form.gradeReleaseEnd),
});

export default function ExamSettingsManagement({ mode }) {
  const [form, setForm] = useState(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingFee, setEditingFee] = useState(null);
  const [feeAmount, setFeeAmount] = useState('');
  const [feeMode, setFeeMode] = useState('FREE');
  const [deletingFee, setDeletingFee] = useState(null);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const page = pages[mode] ?? pages.definition;
  const Icon = page.icon;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setForm(toForm(await getExamSettings()));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeDatePart = (field) => (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
    setForm((current) => {
      const { time } = splitDateTime(current[field]);
      const date = maskDate(digits);
      return { ...current, [field]: time ? `${date} ${time}` : date };
    });
  };
  const changeTimePart = (field) => (event) => {
    const time = maskTime(event.target.value);
    setForm((current) => {
      const { date } = splitDateTime(current[field]);
      return { ...current, [field]: time ? `${date} ${time}` : date };
    });
  };
  const feeRows = feeFields.map((field) => ({
    ...field,
    amount: Number(form[field.name] || 0),
    active: form[field.activeName],
  }));

  const save = async (event) => {
    event.preventDefault();
    const payload = toPayload(form);
    const invalidPeriod = [
      ['examPeriodStart', 'examPeriodEnd'],
      ['gradeReleaseStart', 'gradeReleaseEnd'],
    ].find(([start, end]) => (
      Boolean(form[start]) !== Boolean(form[end])
      || (form[start] && (!parseDateTime(form[start]) || !parseDateTime(form[end])))
      || (form[start] && form[end]
        && parseDateTime(form[start]) >= parseDateTime(form[end]))
    ));
    if (mode === 'periods' && invalidPeriod) {
      setError('Indique datas e horas válidas (dd/mm/aaaa | HH:MM) e confirme que o fim é posterior ao início.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      setForm(toForm(await updateExamSettings(payload)));
      setEditingPeriod(null);
      setNotice('Definições guardadas.');
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const openEditFee = (fee) => {
    setEditingFee(fee);
    setFeeMode(fee.active && fee.amount > 0 ? 'CHARGE' : 'FREE');
    setFeeAmount(fee.amount > 0 ? String(fee.amount) : '');
    setError('');
  };

  const saveFee = async (event) => {
    event.preventDefault();
    const charge = feeMode === 'CHARGE';
    const amount = Number(feeAmount);
    if (charge && (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99)) {
      setError('Indique uma taxa superior a zero.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      setForm(toForm(await updateExamFee(editingFee.type, charge ? amount : null, charge)));
      setEditingFee(null);
      setNotice(charge
        ? 'Definição guardada: a taxa será cobrada nas inscrições.'
        : 'Definição guardada: sem taxa de cobrança nas inscrições.');
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteFee = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      setForm(toForm(await deleteExamFee(deletingFee.type)));
      setDeletingFee(null);
      setNotice('Definição reposta: sem taxa de cobrança.');
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="cacoin-course-page cacoin-settings-page cacoin-test-settings-page">
      <header className="cacoin-page-heading">
        <div>
          <h1><Icon size={23} aria-hidden="true" /> {page.title}</h1>
        </div>
      </header>
      {error && !editingPeriod && !editingFee && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

      {mode === 'statuses' ? (
        <StatusSettingsTable groups={statusGroups} />
      ) : (
        mode === 'definition' ? (
          <section className="cacoin-settings-card">
            <div className="cacoin-settings-section-heading">
              <BadgeDollarSign size={20} />
              <div>
                <h2>Taxas de exame</h2>
              </div>
            </div>
      <StandardTable
        ariaLabel="Taxas de exame"
        showIndex={false}
        columns={[
          { key: 'label', label: 'Tipo de exame' },
          { key: 'amount', label: 'Cobrança' },
          { key: 'actions', label: 'Acções', align: 'right' },
        ]}
        emptyMessage="Não existem definições."
        loading={loading}
        rows={feeRows}
        renderRow={(fee) => (
          <TableRow key={fee.type} hover>
            <TableCell>{fee.label}</TableCell>
            <TableCell>
              {fee.active && fee.amount > 0 ? (
                <>
                  <Money value={fee.amount} />
                  {' '}
                  <span className="cacoin-status-badge paid">Cobrar</span>
                </>
              ) : (
                <span className="cacoin-status-badge neutral">Sem taxa de cobrança</span>
              )}
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Editar">
                <span>
                  <IconButton
                    className="cacoin-table-action-edit"
                    aria-label={`Editar ${fee.label}`}
                    onClick={() => openEditFee(fee)}
                    disabled={saving}
                  >
                    <Pencil size={17} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Repor sem taxa">
                <span>
                  <IconButton
                    className="cacoin-table-action-delete"
                    aria-label={`Repor ${fee.label} sem taxa`}
                    onClick={() => setDeletingFee(fee)}
                    disabled={saving || (fee.amount <= 0 && !fee.active)}
                  >
                    <Trash2 size={17} />
                  </IconButton>
                </span>
              </Tooltip>
            </TableCell>
          </TableRow>
        )}
      />
          </section>
        ) : (
          <>
            <SettingsValuesTable
              ariaLabel="Períodos"
              columns={['Período', 'Início', 'Fim']}
              loading={loading}
              disabled={saving}
              rows={periodSections.map(({ title, start, end }) => ({
                key: start,
                label: title,
                cells: [title, form[start] || '—', form[end] || '—'],
                onEdit: () => {
                  setError('');
                  setEditingPeriod(start);
                },
              }))}
            />
            <SettingsFormDialog
              open={Boolean(editingPeriod)}
              title={periodSections.find(({ start }) => start === editingPeriod)?.title ?? ''}
              onClose={() => { setEditingPeriod(null); load(); }}
              onSubmit={save}
              saving={saving}
              error={error}
              maxWidth="md"
            >
              {periodSections.filter(({ start }) => start === editingPeriod).map(({ start, end }) => {
                const from = splitDateTime(form[start]);
                const to = splitDateTime(form[end]);
                return (
                  <div key={start}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <span>de</span>
                <TextField
                  size="small"
                  label="Data"
                  value={from.date}
                  onChange={changeDatePart(start)}
                  disabled={loading || saving}
                  placeholder="dd/mm/aaaa"
                  sx={{ width: 150 }}
                  slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }}
                />
                <span>|</span>
                <TextField
                  size="small"
                  label="Hora"
                  value={from.time}
                  onChange={changeTimePart(start)}
                  disabled={loading || saving}
                  placeholder="HH:MM"
                  sx={{ width: 100 }}
                  slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 5 } }}
                />
                <span>a</span>
                <TextField
                  size="small"
                  label="Data"
                  value={to.date}
                  onChange={changeDatePart(end)}
                  disabled={loading || saving}
                  placeholder="dd/mm/aaaa"
                  sx={{ width: 150 }}
                  slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }}
                />
                <span>|</span>
                <TextField
                  size="small"
                  label="Hora"
                  value={to.time}
                  onChange={changeTimePart(end)}
                  disabled={loading || saving}
                  placeholder="HH:MM"
                  sx={{ width: 100 }}
                  slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 5 } }}
                />
              </Box>
                  </div>
                );
              })}
            </SettingsFormDialog>
          </>
        )
      )}
      <Dialog
        open={Boolean(editingFee)}
        onClose={() => {
          if (!saving) { setEditingFee(null); setError(''); }
        }}
        fullWidth
        maxWidth="xs"
      >
        <form onSubmit={saveFee}>
          <DialogTitle>Editar — {editingFee?.label}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 1, mt: 1 }}>{error}</Alert>}
            <FormControl sx={{ mt: 1 }} disabled={saving}>
              <FormLabel id="fee-mode-label">Cobrança</FormLabel>
              <RadioGroup
                aria-labelledby="fee-mode-label"
                value={feeMode}
                onChange={(event) => setFeeMode(event.target.value)}
              >
                <FormControlLabel value="FREE" control={<Radio />} label="Sem taxa de cobrança" />
                <FormControlLabel value="CHARGE" control={<Radio />} label="Cobrar" />
              </RadioGroup>
            </FormControl>
            {feeMode === 'CHARGE' && (
              <TextField
                autoFocus
                required
                fullWidth
                size="small"
                type="number"
                label="Taxa"
                value={feeAmount}
                onChange={(event) => setFeeAmount(event.target.value)}
                disabled={saving}
                slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
                sx={{ mt: 1.5 }}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingFee(null)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'A guardar…' : 'Guardar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog
        open={Boolean(deletingFee)}
        onClose={() => {
          if (!saving) setDeletingFee(null);
        }}
      >
        <DialogTitle>Repor sem taxa — {deletingFee?.label}</DialogTitle>
        <DialogActions>
          <Button onClick={() => setDeletingFee(null)} disabled={saving}>Cancelar</Button>
          <Button color="error" onClick={confirmDeleteFee} disabled={saving}>
            {saving ? 'A repor…' : 'Repor'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
