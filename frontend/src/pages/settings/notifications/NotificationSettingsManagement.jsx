import { useCallback, useEffect, useState } from 'react';
import { CircleCheck, MessageCircle, MessageSquareText } from 'lucide-react';
import { Alert, FormControlLabel, Switch, TextField } from '@mui/material';
import SettingsFormDialog from '../../../components/SettingsFormDialog';
import SettingsValuesTable from '../../../components/SettingsValuesTable';
import StatusSettingsTable from '../../../components/StatusSettingsTable';
import {
  getNotificationSettings,
  updateNotificationSettings,
} from '../../../services/api';

const pages = {
  whatsapp: { title: 'WhatsApp', icon: MessageCircle, channel: 'WHATSAPP' },
  sms: { title: 'SMS', icon: MessageSquareText, channel: 'SMS' },
  statuses: { title: 'Estados', icon: CircleCheck },
};
const statusGroups = [{ module: 'NOTIFICATIONS', title: 'Estados das mensagens' }];
const emptySettings = {
  enabled: false,
  provider: '',
  apiUrl: '',
  authHeader: 'Authorization',
  authScheme: 'Bearer',
  apiToken: '',
  tokenConfigured: false,
  clearToken: false,
  sender: '',
  countryCode: '258',
  bodyTemplate: '',
};
const errorMessage = (error) => (
  error.response?.data?.message
  || error.message
  || 'Não foi possível concluir a operação.'
);
const fromResponse = (data) => ({
  ...emptySettings,
  ...Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, value ?? emptySettings[key] ?? '']),
  ),
  apiToken: '',
  clearToken: false,
});

export default function NotificationSettingsManagement({ mode }) {
  const page = pages[mode] ?? pages.whatsapp;
  const Icon = page.icon;
  const [settings, setSettings] = useState(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    if (!page.channel) return;
    setLoading(true);
    setError('');
    try {
      setSettings(fromResponse(await getNotificationSettings(page.channel)));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [page.channel]);

  useEffect(() => {
    load();
  }, [load]);

  const change = (name) => (event) => setSettings((current) => ({
    ...current,
    [name]: event.target.value,
  }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      setSettings(fromResponse(await updateNotificationSettings(page.channel, settings)));
      setEditing(false);
      setNotice('Definições guardadas.');
    } catch (saveError) {
      setError(errorMessage(saveError));
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

      {mode === 'statuses' ? (
        <StatusSettingsTable groups={statusGroups} />
      ) : (
        <>
          {error && !editing && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
          {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
          <SettingsValuesTable
            ariaLabel={`API de ${page.title}`}
            columns={['Canal', 'Fornecedor', 'Endereço da API', 'Remetente', 'Indicativo', 'Token']}
            loading={loading}
            disabled={saving}
            rows={[{
              key: page.channel,
              label: page.title,
              cells: [
                settings.enabled ? 'Activo' : 'Inactivo',
                settings.provider || '—',
                settings.apiUrl || '—',
                settings.sender || '—',
                settings.countryCode || '—',
                settings.tokenConfigured ? 'Configurado' : 'Não configurado',
              ],
              onEdit: () => {
                setError('');
                setEditing(true);
              },
            }]}
          />
          <SettingsFormDialog
            open={editing}
            title={`API de ${page.title}`}
            onClose={() => { setEditing(false); load(); }}
            onSubmit={save}
            saving={saving}
            error={error}
            maxWidth="md"
          >
            <FormControlLabel
              control={(
                <Switch
                  checked={settings.enabled}
                  disabled={loading || saving}
                  onChange={(event) => setSettings((current) => ({
                    ...current,
                    enabled: event.target.checked,
                  }))}
                />
              )}
              label="Canal activo"
            />
            <div className="cacoin-settings-grid">
              <TextField
                size="small"
                label="Fornecedor"
                value={settings.provider}
                onChange={change('provider')}
                disabled={loading || saving}
              />
              <TextField
                size="small"
                label="Endereço da API"
                value={settings.apiUrl}
                onChange={change('apiUrl')}
                disabled={loading || saving}
                placeholder="https://"
              />
              <TextField
                size="small"
                label="Cabeçalho de autenticação"
                value={settings.authHeader}
                onChange={change('authHeader')}
                disabled={loading || saving}
              />
              <TextField
                size="small"
                label="Prefixo da autenticação"
                value={settings.authScheme}
                onChange={change('authScheme')}
                disabled={loading || saving}
              />
              <TextField
                size="small"
                type="password"
                label="Token / Chave da API"
                value={settings.apiToken}
                onChange={change('apiToken')}
                disabled={loading || saving || settings.clearToken}
                placeholder={settings.tokenConfigured ? '••••••••' : ''}
                autoComplete="new-password"
              />
              <TextField
                size="small"
                label="Remetente"
                value={settings.sender}
                onChange={change('sender')}
                disabled={loading || saving}
              />
              <TextField
                required
                size="small"
                label="Indicativo do país"
                value={settings.countryCode}
                onChange={change('countryCode')}
                disabled={loading || saving}
              />
            </div>
            <TextField
              required
              fullWidth
              multiline
              minRows={3}
              size="small"
              label="Corpo do pedido (JSON com {from}, {to} e {message})"
              value={settings.bodyTemplate}
              onChange={change('bodyTemplate')}
              disabled={loading || saving}
              sx={{ mt: 2 }}
            />
            {settings.tokenConfigured && (
              <FormControlLabel
                sx={{ mt: 1 }}
                control={(
                  <Switch
                    checked={settings.clearToken}
                    disabled={saving}
                    onChange={(event) => setSettings((current) => ({
                      ...current,
                      clearToken: event.target.checked,
                    }))}
                  />
                )}
                label="Remover o token guardado"
              />
            )}
          </SettingsFormDialog>
        </>
      )}
    </section>
  );
}
