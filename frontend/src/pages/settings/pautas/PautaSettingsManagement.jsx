import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, CircleCheck } from 'lucide-react';
import { Alert, Box, TextField } from '@mui/material';
import { getPautaSettings, updatePautaPeriod } from '../../../services/api';
import { maskDate, parseDisplayDate, toDisplayDate } from '../../../utils/date';
import SettingsFormDialog from '../../../components/SettingsFormDialog';
import SettingsValuesTable from '../../../components/SettingsValuesTable';
import StatusSettingsTable from '../../../components/StatusSettingsTable';

const statusGroups = [{ module: 'PAUTA_RESULTS', title: 'Resultado' }];

const pages = {
  periods: { title: 'Períodos', icon: CalendarClock },
  results: { title: 'Resultados', icon: CircleCheck },
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
  return `${toDisplayDate(String(value).slice(0, 10))} ${String(value).slice(11, 16)}`;
};
const parseDateTime = (value) => {
  const match = /^(\d{2}\/\d{2}\/\d{4}) (\d{2}):(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  const date = parseDisplayDate(match[1]);
  if (!date || Number(match[2]) > 23 || Number(match[3]) > 59) return null;
  return `${date}T${match[2]}:${match[3]}:00`;
};

export default function PautaSettingsManagement({ mode }) {
  const [period, setPeriod] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(false);
  const page = pages[mode] ?? pages.periods;
  const Icon = page.icon;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await getPautaSettings();
      setPeriod({
        start: dateTimeValue(settings.launchPeriodStart),
        end: dateTimeValue(settings.launchPeriodEnd),
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

  const savePeriod = async (event) => {
    event.preventDefault();
    const start = parseDateTime(period.start);
    const end = parseDateTime(period.end);
    if (Boolean(period.start) !== Boolean(period.end)
      || (period.start && (!start || !end || start >= end))) {
      setError('Indique datas e horas válidas (dd/mm/aaaa | HH:MM) e confirme que o fim é posterior ao início.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await updatePautaPeriod({ launchPeriodStart: start, launchPeriodEnd: end });
      setEditing(false);
      setNotice('Período guardado.');
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const field = (name, part, label, placeholder, width, maxLength) => {
    const value = splitDateTime(period[name])[part];
    return (
      <TextField
        size="small"
        label={label}
        value={value}
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
  };

  return (
    <section className="cacoin-course-page cacoin-settings-page cacoin-test-settings-page">
      <header className="cacoin-page-heading">
        <div>
          <h1><Icon size={23} aria-hidden="true" /> {page.title}</h1>
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

      {mode === 'results' ? (
        <StatusSettingsTable groups={statusGroups} />
      ) : (
        <>
          <SettingsValuesTable
            ariaLabel="Período de lançamento de pautas"
            columns={['Início', 'Fim']}
            loading={loading}
            disabled={saving}
            rows={[{
              key: 'period',
              label: 'período',
              cells: [period.start || '—', period.end || '—'],
              onEdit: () => {
                setError('');
                setEditing(true);
              },
            }]}
          />
          <SettingsFormDialog
            open={editing}
            title="Período de lançamento de pautas"
            onClose={() => { setEditing(false); load(); }}
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
    </section>
  );
}
