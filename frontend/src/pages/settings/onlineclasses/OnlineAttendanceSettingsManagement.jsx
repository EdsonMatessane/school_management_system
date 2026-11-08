import { useCallback, useEffect, useState } from 'react';
import { Alert, TextField } from '@mui/material';
import { CircleCheck, Settings } from 'lucide-react';
import {
  getOnlineAttendanceSettings,
  updateOnlineAttendanceSettings,
} from '../../../services/api';
import '../../onlineclasses/online-classes.css';
import SettingsFormDialog from '../../../components/SettingsFormDialog';
import SettingsValuesTable from '../../../components/SettingsValuesTable';
import StatusSettingsTable from '../../../components/StatusSettingsTable';

const statusGroups = [{ module: 'ATTENDANCE_PRESENCE', title: 'Presença' }, { module: 'ATTENDANCE_PAYMENT', title: 'Pagamento' }, { module: 'ATTENDANCE_JUSTIFICATION', title: 'Justificação' }];

const emptySettings = {
  maxAbsences: '',
  notificationMessage: '',
  justificationFee: '0',
  attendanceStatuses: [],
  justificationStatuses: [],
  paymentStatuses: [],
};



const getErrorMessage = (error) =>
  error.response?.data?.message ||
  error.message ||
  'Não foi possível concluir a operação.';

export default function OnlineAttendanceSettingsManagement({ mode }) {
  const [settings, setSettings] = useState(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const isStatuses = mode === 'statuses';
  const Icon = isStatuses ? CircleCheck : Settings;

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const loaded = await getOnlineAttendanceSettings();
      setSettings({
        ...loaded,
        maxAbsences: loaded.maxAbsences ?? '',
        notificationMessage: loaded.notificationMessage ?? '',
        justificationFee: String(loaded.justificationFee ?? 0),
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const [editing, setEditing] = useState(false);

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await updateOnlineAttendanceSettings({
        maxAbsences: Number(settings.maxAbsences),
        notificationMessage: settings.notificationMessage.trim(),
        justificationFee: Number(settings.justificationFee),
      });
      setSettings({
        ...saved,
        maxAbsences: saved.maxAbsences ?? '',
        notificationMessage: saved.notificationMessage ?? '',
        justificationFee: String(saved.justificationFee ?? 0),
      });
      setEditing(false);
      setNotice('Definições guardadas.');
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="cacoin-course-page cacoin-settings-page cacoin-test-settings-page">
      <header className="cacoin-page-heading">
        <div>
          <h1>
            <Icon size={23} aria-hidden="true" />{' '}
            {isStatuses ? 'Estados' : 'Definição'}
          </h1>
        </div>
      </header>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      {isStatuses ? (
        <StatusSettingsTable groups={statusGroups} />
      ) : (
        <>
          <SettingsValuesTable
            ariaLabel="Definições de presenças"
            columns={['Máximo de faltas', 'Taxa de justificação por falta', 'Mensagem de notificação']}
            loading={loading}
            disabled={saving}
            rows={[{
              key: 'attendance',
              label: 'definições de presenças',
              cells: [
                settings.maxAbsences || '—',
                settings.justificationFee,
                settings.notificationMessage || '—',
              ],
              onEdit: () => {
                setError('');
                setEditing(true);
              },
            }]}
          />
          <SettingsFormDialog
            open={editing}
            title="Definições de presenças"
            onClose={() => { setEditing(false); loadSettings(); }}
            onSubmit={saveSettings}
            saving={saving}
          >
        <div className="cacoin-settings-grid">
          <TextField
            required
            fullWidth
            size="small"
            type="number"
            label="Número máximo de faltas"
            value={settings.maxAbsences}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                maxAbsences: event.target.value,
              }))
            }
            disabled={saving}
            slotProps={{ htmlInput: { min: 1, step: 1 } }}
          />
          <TextField
            required
            fullWidth
            size="small"
            type="number"
            label="Taxa de justificação por falta"
            value={settings.justificationFee}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                justificationFee: event.target.value,
              }))
            }
            disabled={saving}
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
          />
          <TextField
            required
            fullWidth
            multiline
            minRows={3}
            size="small"
            label="Mensagem de notificação"
            value={settings.notificationMessage}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                notificationMessage: event.target.value,
              }))
            }
            disabled={saving}
            className="online-classes-grid-wide"
          />
        </div>
          </SettingsFormDialog>
        </>
      )}
    </section>
  );
}
