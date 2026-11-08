import { useCallback, useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import {
  applyPaymentPeriod,
  getPaymentPeriod,
  previewPaymentPeriod,
  updatePaymentPeriod,
} from '../../../services/api';
import { toDisplayDate } from '../../../utils/date';
import SettingsFormDialog from '../../../components/SettingsFormDialog';
import SettingsValuesTable from '../../../components/SettingsValuesTable';

const defaultPeriod = {
  dueDay: 10,
  graceDays: 0,
  nonBusinessAdjustment: 'NONE',
  saturdayNonBusiness: true,
  sundayNonBusiness: true,
  holidaysNonBusiness: true,
  firstMonthPolicy: 'ENROLLMENT_DATE_IF_LATE',
};
const adjustmentOptions = [
  { value: 'NONE', label: 'Manter a data (sem ajuste)' },
  { value: 'NEXT_BUSINESS_DAY', label: 'Passar para o próximo dia útil' },
  { value: 'PREVIOUS_BUSINESS_DAY', label: 'Antecipar para o dia útil anterior' },
];
const firstMonthOptions = [
  {
    value: 'PATTERN_DAY',
    label: 'Seguir sempre o dia de pagamento (independentemente do dia da inscrição)',
  },
  {
    value: 'ENROLLMENT_DATE_IF_LATE',
    label: 'Usar a data da inscrição se o dia de pagamento já passou',
  },
];

const errorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.'
);
const pickPeriod = (period) => Object.fromEntries(
  Object.keys(defaultPeriod).map((key) => [key, period[key] ?? defaultPeriod[key]]),
);
const toPayload = (form) => ({
  ...form,
  dueDay: Number(form.dueDay),
  graceDays: Number(form.graceDays),
});
const isWholeNumber = (value, min, max) => (
  String(value).trim() !== '' && Number.isInteger(Number(value))
  && Number(value) >= min && Number(value) <= max
);
const weekdayOf = (isoDate) => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-').map(Number);
  const name = new Intl.DateTimeFormat('pt-MZ', { weekday: 'long' })
    .format(new Date(year, month - 1, day));
  return name.charAt(0).toUpperCase() + name.slice(1);
};
const dateWithWeekday = (isoDate) => (
  isoDate ? `${toDisplayDate(isoDate)} (${weekdayOf(isoDate)})` : '—'
);

export default function PaymentPeriodManagement() {
  const [form, setForm] = useState(defaultPeriod);
  const [saved, setSaved] = useState(defaultPeriod);
  const [preview, setPreview] = useState([]);
  const [previewError, setPreviewError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const validDueDay = isWholeNumber(form.dueDay, 1, 31);
  const validGraceDays = isWholeNumber(form.graceDays, 0, 90);
  const validForm = validDueDay && validGraceDays;
  const dirty = JSON.stringify(pickPeriod(toPayload(form))) !== JSON.stringify(saved);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const period = pickPeriod(await getPaymentPeriod());
      setForm(period);
      setSaved(period);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Mostra como ficam os próximos meses com os valores do formulário (mesmo antes de guardar).
  useEffect(() => {
    if (loading || !validForm) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const rows = await previewPaymentPeriod(toPayload(form));
        if (!cancelled) {
          setPreview(rows);
          setPreviewError('');
        }
      } catch (previewLoadError) {
        if (!cancelled) setPreviewError(errorMessage(previewLoadError));
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form, loading, validForm]);

  const [editing, setEditing] = useState(false);

  const changeField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const savePeriod = async (event) => {
    event.preventDefault();
    if (!validForm) {
      setError('Verifique o dia de pagamento (1 a 31) e os dias de tolerância (0 a 90).');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const period = pickPeriod(await updatePaymentPeriod(toPayload(form)));
      setForm(period);
      setSaved(period);
      setEditing(false);
      setNotice(
        'As regras do período foram guardadas e aplicam-se às novas mensalidades. '
        + 'Para actualizar as mensalidades já existentes, use “Aplicar às mensalidades em aberto”.',
      );
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const confirmApply = async () => {
    setApplying(true);
    setError('');
    try {
      const { updated } = await applyPaymentPeriod();
      setApplyOpen(false);
      setNotice(updated === 0
        ? 'Nenhuma mensalidade em aberto precisou de ser actualizada.'
        : `${updated} ${updated === 1
          ? 'mensalidade em aberto foi actualizada'
          : 'mensalidades em aberto foram actualizadas'} com as regras do período.`);
    } catch (applyError) {
      setError(errorMessage(applyError));
    } finally {
      setApplying(false);
    }
  };

  return (
    <section className="cacoin-course-page cacoin-settings-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Pagamentos</p>
          <h1>Período</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <Button
            type="button"
            variant="outlined"
            disabled={loading || saving || applying || dirty}
            onClick={() => setApplyOpen(true)}
            sx={{ textTransform: 'none' }}
          >
            Aplicar às mensalidades em aberto
          </Button>
        </div>
      </header>

      {error && !applyOpen && !editing && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      <SettingsValuesTable
        ariaLabel="Regras do período de pagamento"
        columns={['Dia de pagamento', 'Dias de tolerância', 'Primeira mensalidade', 'Dia não útil', 'Não úteis']}
        loading={loading}
        disabled={saving}
        rows={[{
          key: 'period',
          label: 'regras do período',
          cells: [
            saved.dueDay,
            saved.graceDays,
            firstMonthOptions.find((option) => option.value === saved.firstMonthPolicy)?.label,
            adjustmentOptions.find((option) => option.value === saved.nonBusinessAdjustment)?.label,
            [
              saved.saturdayNonBusiness && 'Sábado',
              saved.sundayNonBusiness && 'Domingo',
              saved.holidaysNonBusiness && 'Feriados',
            ].filter(Boolean).join(', ') || '—',
          ],
          onEdit: () => {
            setError('');
            setEditing(true);
          },
        }]}
      />

      <SettingsFormDialog
        open={editing}
        title="Regras do período de pagamento"
        onClose={() => { setEditing(false); setForm(saved); }}
        onSubmit={savePeriod}
        saving={saving}
        error={error}
        submitDisabled={!dirty}
        submitLabel="Guardar regras"
        maxWidth="md"
      >
      <div className="cacoin-settings-grid">
        <TextField
          required
          fullWidth
          size="small"
          type="number"
          label="Dia de pagamento (dia do mês)"
          value={form.dueDay}
          onChange={(event) => changeField('dueDay', event.target.value)}
          error={!validDueDay}
          helperText={validDueDay
            ? ''
            : 'Indique um dia entre 1 e 31.'}
          disabled={loading}
          slotProps={{ htmlInput: { min: 1, max: 31, step: 1 } }}
        />
        <TextField
          required
          fullWidth
          size="small"
          type="number"
          label="Dias de tolerância"
          value={form.graceDays}
          onChange={(event) => changeField('graceDays', event.target.value)}
          error={!validGraceDays}
          helperText={validGraceDays
            ? ''
            : 'Indique um valor entre 0 e 90.'}
          disabled={loading}
          slotProps={{ htmlInput: { min: 0, max: 90, step: 1 } }}
        />
        <TextField
          select
          fullWidth
          size="small"
          label="Primeira mensalidade (mês da inscrição)"
          value={form.firstMonthPolicy}
          onChange={(event) => changeField('firstMonthPolicy', event.target.value)}
          disabled={loading}
          sx={{ gridColumn: '1 / -1' }}
        >
          {firstMonthOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
          ))}
        </TextField>
      </div>

      <div className="cacoin-settings-grid">
        <TextField
          select
          fullWidth
          size="small"
          label="Quando a data cair num dia não útil"
          value={form.nonBusinessAdjustment}
          onChange={(event) => changeField('nonBusinessAdjustment', event.target.value)}
          disabled={loading}
          sx={{ gridColumn: '1 / -1' }}
        >
          {adjustmentOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
          ))}
        </TextField>
      </div>
      <div className="cacoin-settings-checks">
        <label>
          <input
            type="checkbox"
            checked={form.saturdayNonBusiness}
            onChange={(event) => changeField('saturdayNonBusiness', event.target.checked)}
            disabled={loading}
          />
          Sábado não é dia útil
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.sundayNonBusiness}
            onChange={(event) => changeField('sundayNonBusiness', event.target.checked)}
            disabled={loading}
          />
          Domingo não é dia útil
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.holidaysNonBusiness}
            onChange={(event) => changeField('holidaysNonBusiness', event.target.checked)}
            disabled={loading}
          />
          Feriados não são dias úteis
        </label>
      </div>
      </SettingsFormDialog>

      <section className="cacoin-settings-card">
        <div className="cacoin-settings-section-heading">
          <Eye size={20} />
          <div>
            <h2>Pré-visualização</h2>
          </div>
        </div>
        {previewError && validForm && (
          <Alert severity="error" sx={{ mb: 2 }}>{previewError}</Alert>
        )}
        {!validForm ? (
          <p>Corrija os valores acima para ver a pré-visualização.</p>
        ) : (
          <TableContainer>
            <Table size="small" aria-label="Pré-visualização do período de pagamento">
              <TableHead>
                <TableRow>
                  {['Mês', 'Dia de pagamento', 'Data limite', 'Em atraso a partir de', 'Observação']
                    .map((label) => (
                      <TableCell key={label} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {label}
                      </TableCell>
                    ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.map((row) => (
                  <TableRow key={row.periodLabel} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.periodLabel}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {dateWithWeekday(row.referenceDate)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {dateWithWeekday(row.dueDate)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {dateWithWeekday(row.overdueFrom)}
                    </TableCell>
                    <TableCell>{row.note || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </section>

      <Dialog
        open={applyOpen}
        onClose={() => !applying && setApplyOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Aplicar às mensalidades em aberto</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mt: 1, mb: 1 }}>{error}</Alert>}
          Esta acção recalcula a data limite de todas as mensalidades que ainda têm saldo em
          aberto, segundo as regras guardadas. As mensalidades já pagas não são alteradas.
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setApplyOpen(false)}
            disabled={applying}
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button onClick={confirmApply} disabled={applying} sx={{ textTransform: 'none' }}>
            {applying ? 'A aplicar…' : 'Aplicar'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
