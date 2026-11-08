import { useCallback, useEffect, useState } from 'react';
import {
  BadgeDollarSign,
  CalendarClock,
  CalendarDays,
  CircleCheck,
  ClipboardList,
  Clock3,
  Pencil,
  Plus,
  Power,
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
  IconButton,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import StandardTable from '../../../components/StandardTable';
import Money from '../../../components/Money';
import {
  createGraduationRequirement,
  deleteGraduationFee,
  deleteGraduationRequirement,
  getGraduationSettings,
  setGraduationFeeActive,
  updateGraduationDay,
  updateGraduationFee,
  updateGraduationGuests,
  updateGraduationPeriod,
  updateGraduationRequirement,
} from '../../../services/api';
import { maskDate, parseDisplayDate, toDisplayDate } from '../../../utils/date';
import SettingsFormDialog from '../../../components/SettingsFormDialog';
import SettingsValuesTable from '../../../components/SettingsValuesTable';
import StatusSettingsTable from '../../../components/StatusSettingsTable';

const statusGroups = [{ module: 'GRADUATIONS', title: 'Estados' }];

const pages = {
  definition: { title: 'Definição', icon: BadgeDollarSign },
  statuses: { title: 'Estados', icon: CircleCheck },
  periods: { title: 'Períodos', icon: CalendarClock },
};
const feeRows = [
  { key: 'GRADUATION', field: 'graduationFee', activeField: 'graduationFeeActive', label: 'Taxa de graduação' },
  { key: 'GUESTS', field: 'includedGuests', label: 'Convidados' },
  { key: 'EXTRA_GUEST', field: 'extraGuestFee', activeField: 'extraGuestFeeActive', label: 'Valor por cada convidado extra' },
  { key: 'SPECIAL_EXAM', field: 'specialExamFee', activeField: 'specialExamFeeActive', label: 'Taxa de exame especial' },
];
const emptySettings = {
  graduationFee: 0,
  graduationFeeActive: false,
  includedGuests: 2,
  extraGuestFee: 0,
  extraGuestFeeActive: false,
  specialExamFee: 0,
  specialExamFeeActive: false,
  periodStart: null,
  periodEnd: null,
  ceremonyDate: null,
  ceremonyStartTime: null,
  ceremonyEndTime: null,
  requirements: [],
  requirementsTotal: 0,
};
const errorMessage = (error) => (
  error.response?.data?.message
  || error.message
  || 'Não foi possível concluir a operação.'
);
const splitDateTime = (value) => {
  const [date = '', time = ''] = String(value ?? '').split(' ');
  return { date, time };
};
const maskTime = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
};
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
const parseTime = (value) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value ?? '');
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  return `${match[1]}:${match[2]}:00`;
};
const timeValue = (value) => (value ? String(value).slice(0, 5) : '');
const isPositiveAmount = (amount) => (
  Number.isFinite(amount) && amount > 0 && amount <= 9999999999.99
);

export default function GraduationSettingsManagement({ mode }) {
  const [settings, setSettings] = useState(emptySettings);
  const [period, setPeriod] = useState({ periodStart: '', periodEnd: '' });
  const [day, setDay] = useState({ date: '', start: '', end: '' });
  const [editingPeriod, setEditingPeriod] = useState(false);
  const [editingDay, setEditingDay] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [rowValue, setRowValue] = useState('');
  const [deletingRow, setDeletingRow] = useState(null);
  const [editingRequirement, setEditingRequirement] = useState(null);
  const [deletingRequirement, setDeletingRequirement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const page = pages[mode] ?? pages.definition;
  const Icon = page.icon;

  const applySettings = useCallback((loaded) => {
    setSettings(loaded);
    setPeriod({
      periodStart: dateTimeValue(loaded.periodStart),
      periodEnd: dateTimeValue(loaded.periodEnd),
    });
    setDay({
      date: loaded.ceremonyDate ? toDisplayDate(loaded.ceremonyDate) : '',
      start: timeValue(loaded.ceremonyStartTime),
      end: timeValue(loaded.ceremonyEndTime),
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      applySettings(await getGraduationSettings());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [applySettings]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action, successMessage) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await action();
      if (successMessage) setNotice(successMessage);
      return true;
    } catch (actionError) {
      setError(errorMessage(actionError));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openEditRow = (row) => {
    setEditingRow(row);
    const current = settings[row.field];
    setRowValue(Number(current) > 0 || row.key === 'GUESTS' ? String(current) : '');
    setError('');
  };

  const saveRow = async (event) => {
    event.preventDefault();
    const value = Number(rowValue);
    if (editingRow.key === 'GUESTS') {
      if (!Number.isInteger(value) || value < 0 || value > 50) {
        setError('O número de convidados deve estar entre 0 e 50.');
        return;
      }
    } else if (!isPositiveAmount(value)) {
      setError('Indique um valor superior a zero.');
      return;
    }
    const done = await run(async () => applySettings(
      editingRow.key === 'GUESTS'
        ? await updateGraduationGuests(value)
        : await updateGraduationFee(editingRow.key, value),
    ), 'Definição guardada.');
    if (done) setEditingRow(null);
  };

  const confirmDeleteRow = async () => {
    const done = await run(
      async () => applySettings(await deleteGraduationFee(deletingRow.key)),
      'Definição apagada.',
    );
    if (done) setDeletingRow(null);
  };

  const toggleRow = (row) => run(
    async () => applySettings(
      await setGraduationFeeActive(row.key, !settings[row.activeField]),
    ),
    settings[row.activeField] ? 'Definição desactivada.' : 'Definição activada.',
  );

  const savePeriod = async (event) => {
    event.preventDefault();
    const start = parseDateTime(period.periodStart);
    const end = parseDateTime(period.periodEnd);
    if (Boolean(period.periodStart) !== Boolean(period.periodEnd)
      || (period.periodStart && (!start || !end || start >= end))) {
      setError('Indique datas e horas válidas (dd/mm/aaaa | HH:MM) e confirme que o fim é posterior ao início.');
      return;
    }
    const done = await run(async () => applySettings(
      await updateGraduationPeriod({ periodStart: start, periodEnd: end }),
    ), 'Período guardado.');
    if (done) setEditingPeriod(false);
  };

  const saveDay = async (event) => {
    event.preventDefault();
    const date = parseDisplayDate(day.date);
    const start = parseTime(day.start);
    const end = parseTime(day.end);
    if (!date || !start || !end || start >= end) {
      setError('Indique o dia (dd/mm/aaaa) e as horas (HH:MM), com o fim posterior ao início.');
      return;
    }
    const done = await run(async () => applySettings(
      await updateGraduationDay({ date, startTime: start, endTime: end }),
    ), 'Dia da graduação guardado.');
    if (done) setEditingDay(false);
  };

  const saveRequirement = async (event, requirement) => {
    event.preventDefault();
    const form = requirement;
    const amount = Number(form.amount);
    if (!form.name.trim() || !isPositiveAmount(amount)) {
      setError('Indique o nome do requisito e um valor superior a zero.');
      return;
    }
    const payload = { name: form.name.trim(), amount };
    const done = await run(async () => {
      if (requirement.id) {
        await updateGraduationRequirement(requirement.id, payload);
      } else {
        await createGraduationRequirement(payload);
      }
      await load();
    }, requirement.id ? 'Requisito guardado.' : 'Requisito adicionado.');
    if (done) setEditingRequirement(null);
  };

  const confirmDeleteRequirement = async () => {
    const done = await run(async () => {
      await deleteGraduationRequirement(deletingRequirement.id);
      await load();
    }, 'Requisito apagado.');
    if (done) setDeletingRequirement(null);
  };

  const renderDateTimeRow = (startField, endField) => {
    const from = splitDateTime(period[startField]);
    const to = splitDateTime(period[endField]);
    const change = (field, part) => (event) => {
      setPeriod((current) => {
        const parts = splitDateTime(current[field]);
        const next = part === 'date'
          ? maskDate(event.target.value.replace(/\D/g, '').slice(0, 8))
          : maskTime(event.target.value);
        const date = part === 'date' ? next : parts.date;
        const time = part === 'time' ? next : parts.time;
        return { ...current, [field]: time ? `${date} ${time}` : date };
      });
    };
    const field = (label, value, onChange, placeholder, width, maxLength) => (
      <TextField
        size="small"
        label={label}
        value={value}
        onChange={onChange}
        disabled={loading || saving}
        placeholder={placeholder}
        sx={{ width }}
        slotProps={{ htmlInput: { inputMode: 'numeric', maxLength } }}
      />
    );
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <span>de</span>
        {field('Data', from.date, change(startField, 'date'), 'dd/mm/aaaa', 150, 10)}
        <span>|</span>
        {field('Hora', from.time, change(startField, 'time'), 'HH:MM', 100, 5)}
        <span>a</span>
        {field('Data', to.date, change(endField, 'date'), 'dd/mm/aaaa', 150, 10)}
        <span>|</span>
        {field('Hora', to.time, change(endField, 'time'), 'HH:MM', 100, 5)}
      </Box>
    );
  };

  return (
    <section className="cacoin-course-page cacoin-settings-page cacoin-test-settings-page">
      <header className="cacoin-page-heading">
        <div>
          <h1><Icon size={23} aria-hidden="true" /> {page.title}</h1>
        </div>
      </header>
      {error && !editingPeriod && !editingDay && !editingRow && !editingRequirement && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

      {mode === 'statuses' && (
        <StatusSettingsTable groups={statusGroups} />
      )}

      {mode === 'periods' && (
        <>
          <section className="cacoin-settings-card">
            <div className="cacoin-settings-section-heading">
              <Clock3 size={20} />
              <div>
                <h2>Período de graduação</h2>
              </div>
            </div>
            <SettingsValuesTable
              ariaLabel="Período de graduação"
              columns={['Início', 'Fim']}
              loading={loading}
              disabled={saving}
              rows={[{
                key: 'period',
                label: 'período de graduação',
                cells: [period.periodStart || '—', period.periodEnd || '—'],
                onEdit: () => {
                  setError('');
                  setEditingPeriod(true);
                },
              }]}
            />
          </section>
          <section className="cacoin-settings-card">
            <div className="cacoin-settings-section-heading">
              <CalendarDays size={20} />
              <div>
                <h2>Dia da Graduação</h2>
              </div>
            </div>
            <SettingsValuesTable
              ariaLabel="Dia da graduação"
              columns={['Data', 'Início', 'Fim']}
              loading={loading}
              disabled={saving}
              rows={[{
                key: 'day',
                label: 'dia da graduação',
                cells: [
                  settings.ceremonyDate ? toDisplayDate(settings.ceremonyDate) : '—',
                  settings.ceremonyDate ? timeValue(settings.ceremonyStartTime) : '—',
                  settings.ceremonyDate ? timeValue(settings.ceremonyEndTime) : '—',
                ],
                onEdit: () => {
                  setError('');
                  setEditingDay(true);
                },
              }]}
            />
          </section>
          <SettingsFormDialog
            open={editingPeriod}
            title="Período de graduação"
            onClose={() => { setEditingPeriod(false); applySettings(settings); }}
            onSubmit={savePeriod}
            saving={saving}
            error={error}
            maxWidth="md"
          >
            {renderDateTimeRow('periodStart', 'periodEnd')}
          </SettingsFormDialog>
          <SettingsFormDialog
            open={editingDay}
            title="Dia da Graduação"
            onClose={() => { setEditingDay(false); applySettings(settings); }}
            onSubmit={saveDay}
            saving={saving}
            error={error}
            maxWidth="md"
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                label="Data"
                value={day.date}
                onChange={(event) => setDay((current) => ({
                  ...current,
                  date: maskDate(event.target.value.replace(/\D/g, '').slice(0, 8)),
                }))}
                disabled={saving}
                placeholder="dd/mm/aaaa"
                sx={{ width: 150 }}
                slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }}
              />
              <span>|</span>
              <span>de</span>
              <TextField
                size="small"
                label="Hora"
                value={day.start}
                onChange={(event) => setDay((current) => ({
                  ...current,
                  start: maskTime(event.target.value),
                }))}
                disabled={saving}
                placeholder="HH:MM"
                sx={{ width: 100 }}
                slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 5 } }}
              />
              <span>a</span>
              <TextField
                size="small"
                label="Hora"
                value={day.end}
                onChange={(event) => setDay((current) => ({
                  ...current,
                  end: maskTime(event.target.value),
                }))}
                disabled={saving}
                placeholder="HH:MM"
                sx={{ width: 100 }}
                slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 5 } }}
              />
            </Box>
          </SettingsFormDialog>
        </>
      )}

      {mode !== 'statuses' && mode !== 'periods' && (
        <>
          <section className="cacoin-settings-card">
            <div className="cacoin-settings-section-heading">
              <BadgeDollarSign size={20} />
              <div>
                <h2>Taxas</h2>
              </div>
            </div>
            <StandardTable
              ariaLabel="Taxas da graduação"
              showIndex={false}
              columns={[
                { key: 'label', label: 'Definição' },
                { key: 'value', label: 'Valor' },
                { key: 'actions', label: 'Acções', align: 'right' },
              ]}
              emptyMessage="Não existem definições."
              loading={loading}
              rows={feeRows}
              renderRow={(row) => {
                const isGuests = row.key === 'GUESTS';
                const amount = Number(settings[row.field] || 0);
                const active = isGuests ? true : settings[row.activeField];
                return (
                  <TableRow key={row.key} hover>
                    <TableCell>{row.label}</TableCell>
                    <TableCell>
                      {isGuests ? (
                        `${settings.includedGuests} convidados`
                      ) : amount > 0 ? (
                        <>
                          <Money value={amount} />
                          {' '}
                          <span className={`cacoin-status-badge ${active ? 'paid' : 'pending'}`}>
                            {active ? 'Activo' : 'Inactivo'}
                          </span>
                        </>
                      ) : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <span>
                          <IconButton
                            className="cacoin-table-action-edit"
                            aria-label={`Editar ${row.label}`}
                            onClick={() => openEditRow(row)}
                            disabled={saving}
                          >
                            <Pencil size={17} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      {!isGuests && (
                        <>
                          <Tooltip title={active ? 'Desactivar' : 'Activar'}>
                            <span>
                              <IconButton
                                className={
                                  active
                                    ? 'cacoin-table-action-deactivate'
                                    : 'cacoin-table-action-activate'
                                }
                                aria-label={`${active ? 'Desactivar' : 'Activar'} ${row.label}`}
                                onClick={() => toggleRow(row)}
                                disabled={saving || amount <= 0}
                              >
                                <Power size={17} />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Apagar">
                            <span>
                              <IconButton
                                className="cacoin-table-action-delete"
                                aria-label={`Apagar ${row.label}`}
                                onClick={() => setDeletingRow(row)}
                                disabled={saving || amount <= 0}
                              >
                                <Trash2 size={17} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              }}
            />
          </section>

          <section className="cacoin-settings-card">
            <div className="cacoin-status-table-heading">
              <div className="cacoin-settings-section-heading">
                <ClipboardList size={20} />
                <div>
                  <h2>Requisitos</h2>
                </div>
              </div>
              <Button
                variant="contained"
                size="small"
                startIcon={<Plus size={16} />}
                disabled={loading || saving}
                onClick={() => {
                  setError('');
                  setEditingRequirement({ id: null, name: '', amount: '' });
                }}
              >
                Adicionar
              </Button>
            </div>
            <StandardTable
              ariaLabel="Requisitos da graduação"
              columns={[
                { key: 'name', label: 'Nome' },
                { key: 'amount', label: 'Valor' },
                { key: 'actions', label: 'Acções', align: 'right' },
              ]}
              emptyMessage="Ainda não existem requisitos."
              loading={loading}
              rows={settings.requirements}
              renderRow={(row, rowNumber) => (
                <TableRow key={row.id} hover>
                  <TableCell>{rowNumber}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell><Money value={row.amount} /></TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <span>
                        <IconButton
                          className="cacoin-table-action-edit"
                          aria-label={`Editar requisito ${row.name}`}
                          onClick={() => {
                            setEditingRequirement({
                              id: row.id,
                              name: row.name,
                              amount: String(row.amount),
                            });
                            setError('');
                          }}
                          disabled={saving}
                        >
                          <Pencil size={17} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Apagar">
                      <span>
                        <IconButton
                          className="cacoin-table-action-delete"
                          aria-label={`Apagar requisito ${row.name}`}
                          onClick={() => setDeletingRequirement(row)}
                          disabled={saving}
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
        </>
      )}

      <Dialog
        open={Boolean(editingRow)}
        onClose={() => !saving && setEditingRow(null)}
        fullWidth
        maxWidth="xs"
      >
        <form onSubmit={saveRow}>
          <DialogTitle>Editar {editingRow?.label}</DialogTitle>
          <DialogContent>
            <TextField
              required
              autoFocus
              fullWidth
              size="small"
              type="number"
              label={editingRow?.label}
              value={rowValue}
              onChange={(event) => setRowValue(event.target.value)}
              sx={{ mt: 1 }}
              slotProps={{
                htmlInput: editingRow?.key === 'GUESTS'
                  ? { min: 0, max: 50, step: 1 }
                  : { min: 0.01, step: 0.01 },
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingRow(null)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'A guardar…' : 'Guardar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deletingRow)}
        onClose={() => !saving && setDeletingRow(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Apagar {deletingRow?.label}</DialogTitle>
        <DialogContent>
          Tem a certeza de que pretende apagar esta definição?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingRow(null)} disabled={saving}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDeleteRow} disabled={saving}>
            {saving ? 'A apagar…' : 'Apagar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(editingRequirement)}
        onClose={() => !saving && setEditingRequirement(null)}
        fullWidth
        maxWidth="xs"
      >
        <form onSubmit={(event) => saveRequirement(event, editingRequirement)}>
          <DialogTitle>{editingRequirement?.id ? 'Editar requisito' : 'Novo requisito'}</DialogTitle>
          <DialogContent>
            <TextField
              required
              autoFocus
              fullWidth
              size="small"
              label="Nome"
              value={editingRequirement?.name ?? ''}
              onChange={(event) => setEditingRequirement((current) => ({
                ...current,
                name: event.target.value,
              }))}
              sx={{ mt: 1 }}
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            <TextField
              required
              fullWidth
              size="small"
              type="number"
              label="Valor"
              value={editingRequirement?.amount ?? ''}
              onChange={(event) => setEditingRequirement((current) => ({
                ...current,
                amount: event.target.value,
              }))}
              sx={{ mt: 1.5 }}
              slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingRequirement(null)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'A guardar…' : editingRequirement?.id ? 'Guardar' : 'Adicionar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deletingRequirement)}
        onClose={() => !saving && setDeletingRequirement(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Apagar requisito</DialogTitle>
        <DialogContent>
          Tem a certeza de que pretende apagar o requisito {deletingRequirement?.name}?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingRequirement(null)} disabled={saving}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDeleteRequirement}
            disabled={saving}
          >
            {saving ? 'A apagar…' : 'Apagar'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
