import { useCallback, useEffect, useState } from 'react';
import {
  Banknote,
  CalendarClock,
  CircleCheck,
  Gift,
  Settings,
} from 'lucide-react';
import {
  Alert,
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material';
import {
  createFinanceBonusType,
  createFinanceSalaryType,
  deleteFinanceBonusType,
  deleteFinanceSalaryType,
  getFinanceBonusTypes,
  getFinanceSalaryTypes,
  getFinanceSettings,
  updateFinanceBonusType,
  updateFinancePeriod,
  updateFinanceRules,
  updateFinanceSalaryType,
} from '../../../services/api';
import { maskDate, parseDisplayDate, toDisplayDate } from '../../../utils/date';
import FinanceCatalogSection from './FinanceCatalogSection';
import SettingsFormDialog from '../../../components/SettingsFormDialog';
import SettingsValuesTable from '../../../components/SettingsValuesTable';
import StatusSettingsTable from '../../../components/StatusSettingsTable';

const statusGroups = [{ module: 'FINANCE', title: 'Estados' }];

const pages = {
  definition: { title: 'Definição', icon: Settings },
  periods: { title: 'Períodos', icon: CalendarClock },
  statuses: { title: 'Estados', icon: CircleCheck },
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
const dateTimeValue = (value) => (
  value ? `${toDisplayDate(String(value).slice(0, 10))} ${String(value).slice(11, 16)}` : ''
);
const parseDateTime = (value) => {
  const match = /^(\d{2}\/\d{2}\/\d{4}) (\d{2}):(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  const date = parseDisplayDate(match[1]);
  if (!date || Number(match[2]) > 23 || Number(match[3]) > 59) return null;
  return `${date}T${match[2]}:${match[3]}:00`;
};

export default function FinanceSettingsManagement({ mode }) {
  const [salaryTypes, setSalaryTypes] = useState([]);
  const [bonusTypes, setBonusTypes] = useState([]);
  const [rules, setRules] = useState({ paymentRule: 'FULL', maxAdvanceMonths: '1' });
  const [period, setPeriod] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);
  const page = pages[mode] ?? pages.definition;
  const Icon = page.icon;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedSalary, loadedBonus, settings] = await Promise.all([
        getFinanceSalaryTypes(),
        getFinanceBonusTypes(),
        getFinanceSettings(),
      ]);
      setSalaryTypes(loadedSalary);
      setBonusTypes(loadedBonus);
      setRules({
        paymentRule: settings.paymentRule,
        maxAdvanceMonths: String(settings.maxAdvanceMonths),
      });
      setPeriod({
        start: dateTimeValue(settings.processingPeriodStart),
        end: dateTimeValue(settings.processingPeriodEnd),
      });
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action, message) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await action();
      setEditing(null);
      setNotice(message);
    } catch (actionError) {
      setError(errorMessage(actionError));
    } finally {
      setSaving(false);
    }
  };

  const saveRules = (event) => {
    event.preventDefault();
    const months = Number(rules.maxAdvanceMonths);
    if (!Number.isInteger(months) || months < 0 || months > 12) {
      setError('Os meses de adiantamento devem estar entre 0 e 12.');
      return;
    }
    run(
      () => updateFinanceRules({ paymentRule: rules.paymentRule, maxAdvanceMonths: months }),
      'Regras guardadas.',
    );
  };

  const savePeriod = (event) => {
    event.preventDefault();
    const start = parseDateTime(period.start);
    const end = parseDateTime(period.end);
    if (Boolean(period.start) !== Boolean(period.end)
      || (period.start && (!start || !end || start >= end))) {
      setError('Indique datas e horas válidas (dd/mm/aaaa | HH:MM) e confirme que o fim é posterior ao início.');
      return;
    }
    run(
      () => updateFinancePeriod({ periodStart: start, periodEnd: end }),
      'Período guardado.',
    );
  };

  const field = (name, part, label, placeholder, width, maxLength) => (
    <TextField
      size="small"
      label={label}
      value={splitDateTime(period[name])[part]}
      onChange={(event) => setPeriod((current) => {
        const parts = splitDateTime(current[name]);
        const next = part === 'date'
          ? maskDate(event.target.value.replace(/\D/g, '').slice(0, 8))
          : maskTime(event.target.value);
        const date = part === 'date' ? next : parts.date;
        const time = part === 'time' ? next : parts.time;
        return { ...current, [name]: time ? `${date} ${time}` : date };
      })}
      disabled={loading || saving}
      placeholder={placeholder}
      sx={{ width }}
      slotProps={{ htmlInput: { inputMode: 'numeric', maxLength } }}
    />
  );

  return (
    <section className="cacoin-course-page cacoin-settings-page cacoin-test-settings-page">
      <header className="cacoin-page-heading">
        <div>
          <h1><Icon size={23} aria-hidden="true" /> {page.title}</h1>
        </div>
      </header>
      {error && !editing && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

      {mode === 'statuses' && (
        <StatusSettingsTable groups={statusGroups} />
      )}

      {mode === 'periods' && (
        <>
          <SettingsValuesTable
            ariaLabel="Período de processamento de salário"
            columns={['Início', 'Fim']}
            loading={loading}
            disabled={saving}
            rows={[{
              key: 'period',
              label: 'período',
              cells: [period.start || '—', period.end || '—'],
              onEdit: () => {
                setError('');
                setEditing('period');
              },
            }]}
          />
          <SettingsFormDialog
            open={editing === 'period'}
            title="Período de Processamento de Salário"
            onClose={() => { setEditing(null); load(); }}
            onSubmit={savePeriod}
            saving={saving}
            maxWidth="md"
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <span>de</span>
              {field('start', 'date', 'Data', 'dd/mm/aaaa', 150, 10)}
              <span>|</span>
              {field('start', 'time', 'Hora', 'HH:MM', 100, 5)}
              <span>a</span>
              {field('end', 'date', 'Data', 'dd/mm/aaaa', 150, 10)}
              <span>|</span>
              {field('end', 'time', 'Hora', 'HH:MM', 100, 5)}
            </Box>
          </SettingsFormDialog>
        </>
      )}

      {mode !== 'statuses' && mode !== 'periods' && (
        <>
          <FinanceCatalogSection
            audit="FinanceSalaryType"
            title="Tipo de Salário"
            icon={Banknote}
            items={salaryTypes}
            loading={loading}
            withAmount
            nameLabel="Salário"
            onCreate={createFinanceSalaryType}
            onUpdate={updateFinanceSalaryType}
            onDelete={deleteFinanceSalaryType}
            onChanged={load}
          />
          <FinanceCatalogSection
            audit="FinanceBonusType"
            title="Tipo de Bónus"
            icon={Gift}
            items={bonusTypes}
            loading={loading}
            withAmount
            nameLabel="Bónus"
            onCreate={createFinanceBonusType}
            onUpdate={updateFinanceBonusType}
            onDelete={deleteFinanceBonusType}
            onChanged={load}
          />
          <SettingsValuesTable
            ariaLabel="Regras"
            columns={['Regra de pagamento', 'Adiantamento (meses)']}
            loading={loading}
            disabled={saving}
            rows={[{
              key: 'rules',
              label: 'regras',
              cells: [rules.paymentRule === 'PARTIAL' ? 'Parcial' : 'Completo', rules.maxAdvanceMonths],
              onEdit: () => {
                setError('');
                setEditing('rules');
              },
            }]}
          />
          <SettingsFormDialog
            open={editing === 'rules'}
            title="Regras"
            onClose={() => { setEditing(null); load(); }}
            onSubmit={saveRules}
            saving={saving}
          >
            <div className="cacoin-settings-grid">
              <FormControl>
                <FormLabel>Regra de pagamento</FormLabel>
                <RadioGroup
                  row
                  value={rules.paymentRule}
                  onChange={(event) => setRules((current) => ({ ...current, paymentRule: event.target.value }))}
                >
                  <FormControlLabel value="PARTIAL" control={<Radio size="small" />} label="Parcial" />
                  <FormControlLabel value="FULL" control={<Radio size="small" />} label="Completo" />
                </RadioGroup>
              </FormControl>
              <TextField
                required
                fullWidth
                size="small"
                type="number"
                label="Regra de adiantamento (meses)"
                value={rules.maxAdvanceMonths}
                onChange={(event) => setRules((current) => ({ ...current, maxAdvanceMonths: event.target.value }))}
                disabled={saving}
                slotProps={{ htmlInput: { min: 0, max: 12, step: 1 } }}
              />
            </div>
          </SettingsFormDialog>
        </>
      )}
    </section>
  );
}
