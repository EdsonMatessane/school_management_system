import { useCallback, useEffect, useState } from 'react';
import { Alert, TextField } from '@mui/material';
import { CircleCheck, Settings } from 'lucide-react';
import {
  getOnlineClassPlatforms,
  updateOnlineClassPlatforms,
} from '../../../services/api';
import '../../onlineclasses/online-classes.css';
import SettingsFormDialog from '../../../components/SettingsFormDialog';
import SettingsValuesTable from '../../../components/SettingsValuesTable';
import StatusSettingsTable from '../../../components/StatusSettingsTable';

const statusGroups = [{ module: 'ONLINE_CLASSES', title: 'Estados' }];

const platforms = [
  { value: 'GOOGLE_MEET', label: 'Google Meet' },
  { value: 'ZOOM', label: 'Zoom' },
  { value: 'TEAMS', label: 'Microsoft Teams' },
  { value: 'OTHER', label: 'Outro' },
];


const getErrorMessage = (error) =>
  error.response?.data?.message ||
  error.message ||
  'Não foi possível concluir a operação.';

export default function OnlineClassesSettingsManagement({ mode }) {
  const [platformSettings, setPlatformSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);
  const isStatuses = mode === 'statuses';
  const Icon = isStatuses ? CircleCheck : Settings;

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPlatformSettings(await getOnlineClassPlatforms());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isStatuses) return;
    loadSettings();
  }, [isStatuses, loadSettings]);

  const updateUrl = (platform, url) => {
    setPlatformSettings((current) =>
      current.map((setting) =>
        setting.platform === platform ? { ...setting, url } : setting,
      ),
    );
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      setPlatformSettings(
        await updateOnlineClassPlatforms(platformSettings),
      );
      setEditing(null);
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
            ariaLabel="Plataformas"
            columns={['Plataforma', 'Link']}
            loading={loading}
            disabled={saving}
            rows={platforms.map((platform) => ({
              key: platform.value,
              label: platform.label,
              cells: [
                platform.label,
                platformSettings.find((item) => item.platform === platform.value)?.url || '—',
              ],
              onEdit: () => {
                setError('');
                setEditing(platform.value);
              },
            }))}
          />
          <SettingsFormDialog
            open={Boolean(editing)}
            title={platforms.find((item) => item.value === editing)?.label ?? 'Editar'}
            onClose={() => { setEditing(null); loadSettings(); }}
            onSubmit={saveSettings}
            saving={saving}
          >
            <TextField
              fullWidth
              size="small"
              type="url"
              label="Link"
              value={platformSettings.find((item) => item.platform === editing)?.url || ''}
              onChange={(event) => updateUrl(editing, event.target.value)}
              disabled={saving}
            />
          </SettingsFormDialog>
        </>
      )}
    </section>
  );
}
