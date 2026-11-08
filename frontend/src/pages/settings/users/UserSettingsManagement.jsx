import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { Ban, CircleCheck, Clock3, KeyRound, LockOpen, Pencil, Plus, ShieldCheck, UserCog } from 'lucide-react';
import SettingsFormDialog from '../../../components/SettingsFormDialog';
import SettingsValuesTable from '../../../components/SettingsValuesTable';
import StandardTable from '../../../components/StandardTable';
import StatusBadge from '../../../components/StatusBadge';
import StatusSettingsTable from '../../../components/StatusSettingsTable';
import {
  applyUserAccountAction,
  createAdminAccount,
  getAuthToken,
  getUserAccounts,
  getUserSettings,
  holdUnauthorizedRedirect,
  updateAdminAccount,
  updateUserSettings,
} from '../../../services/api';
import { displayText } from '../../../utils/displayText';
import { accessWindow, errorMessage, formatDate } from '../../users/userUtils';

const pages = {
  admins: { title: 'Administrador do Sistema', icon: UserCog },
  password: { title: 'Palavra-passe', icon: KeyRound },
  access: { title: 'Acesso', icon: Clock3 },
  statuses: { title: 'Estados', icon: CircleCheck },
};
const statusGroups = [{ module: 'USERS', title: 'Estados das contas' }];
const emptyAdmin = {
  firstName: '',
  surname: '',
  accessStart: '',
  accessEnd: '',
  notes: '',
};
const emptySettings = {
  uppercaseCharacters: '',
  lowercaseCharacters: '',
  numberCharacters: '',
  specialCharacters: '',
  maxAttempts: 3,
  maxLength: 8,
  maxUppercase: 2,
  minDigits: 1,
  minSpecial: 1,
  staffAccessStart: '',
  staffAccessEnd: '',
  studentAccessStart: '',
  studentAccessEnd: '',
};
const adminColumns = [
  { key: 'code', label: 'Código' },
  { key: 'name', label: 'Nome' },
  { key: 'createdAt', label: 'Data de Criação' },
  { key: 'access', label: 'Data & Hora de Acesso' },
  { key: 'notes', label: 'Observação' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: 'Acções', align: 'right' },
];
const characterFields = [
  { key: 'uppercaseCharacters', label: 'Maiúsculas' },
  { key: 'lowercaseCharacters', label: 'Minúsculas' },
  { key: 'numberCharacters', label: 'Números' },
  { key: 'specialCharacters', label: 'Caracteres especiais' },
];
const ruleFields = [
  { key: 'maxLength', label: 'Comprimento máximo' },
  { key: 'maxUppercase', label: 'Número máximo de maiúsculas' },
  { key: 'minDigits', label: 'Número mínimo de dígitos' },
  { key: 'minSpecial', label: 'Número mínimo de caracteres especiais' },
];

const TimeField = ({ label, value, onChange, disabled }) => (
  <TextField
    fullWidth
    size="small"
    type="time"
    label={label}
    value={value ?? ''}
    onChange={(event) => onChange(event.target.value)}
    disabled={disabled}
    slotProps={{ inputLabel: { shrink: true } }}
  />
);

export default function UserSettingsManagement({ mode }) {
  const page = pages[mode] ?? pages.admins;
  const Icon = page.icon;
  const [admins, setAdmins] = useState([]);
  const [admin, setAdmin] = useState(emptyAdmin);
  const [editingId, setEditingId] = useState(null);
  const [custom, setCustom] = useState(false);
  const [settings, setSettings] = useState(emptySettings);
  const [credential, setCredential] = useState(null);
  const [firstSetup, setFirstSetup] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (mode === 'statuses') return;
    setLoading(true);
    setError('');
    try {
      if (mode === 'admins') {
        setAdmins(await getUserAccounts('ADMIN'));
      } else {
        setSettings(await getUserSettings());
      }
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    load();
  }, [load]);

  const resetAdminForm = () => {
    setAdmin(emptyAdmin);
    setEditingId(null);
    setCustom(false);
    setAdminOpen(false);
  };

  const openNewAdmin = () => {
    setAdmin(emptyAdmin);
    setEditingId(null);
    setCustom(false);
    setError('');
    setAdminOpen(true);
  };

  const saveAdmin = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      ...admin,
      accessStart: custom ? admin.accessStart : '',
      accessEnd: custom ? admin.accessEnd : '',
    };
    try {
      if (editingId) {
        await updateAdminAccount(editingId, payload);
        setNotice('Administrador actualizado.');
      } else {
        // Sem sessão = configuração inicial: este é o primeiro administrador.
        const initial = !getAuthToken();
        if (initial) holdUnauthorizedRedirect(true);
        const created = await createAdminAccount(payload);
        setFirstSetup(initial);
        setCredential(created);
        setNotice('Administrador criado.');
        if (initial) {
          // A lista já exige sessão; só se carrega depois de entrar.
          resetAdminForm();
          return;
        }
      }
      resetAdminForm();
      await load();
    } catch (saveError) {
      holdUnauthorizedRedirect(false);
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  // Depois de anotar a palavra-passe do primeiro administrador, segue-se para o login.
  const closeCredential = () => {
    setCredential(null);
    if (firstSetup) {
      holdUnauthorizedRedirect(false);
      window.location.reload();
    }
  };

  const runAction = async (account, action, message) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await applyUserAccountAction(account.id, action);
      if (result.temporaryPassword) setCredential(result);
      setNotice(`${message} ${account.code}`);
      await load();
    } catch (actionError) {
      setError(errorMessage(actionError));
    } finally {
      setSaving(false);
    }
  };

  const edit = (account) => {
    setError('');
    setAdminOpen(true);
    setEditingId(account.id);
    setCustom(Boolean(account.accessStart && account.accessEnd));
    setAdmin({
      firstName: account.firstName ?? '',
      surname: account.surname ?? '',
      accessStart: account.accessStart ?? '',
      accessEnd: account.accessEnd ?? '',
      notes: account.notes ?? '',
    });
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      setSettings(await updateUserSettings(settings));
      setEditingSetting(null);
      setNotice('Definições guardadas.');
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const changeSetting = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const numberValue = (value) => (value === '' ? '' : Number(value));
  const timeRange = (start, end) => (settings[start] || settings[end]
    ? `${settings[start] || '—'} – ${settings[end] || '—'}`
    : '—');
  const settingItems = {
    ...Object.fromEntries(characterFields.map(({ key, label }) => [key, {
      label,
      value: settings[key] || '—',
      render: () => (
        <TextField
          required
          fullWidth
          size="small"
          label={label}
          value={settings[key]}
          onChange={(event) => changeSetting(key, event.target.value)}
          disabled={saving}
          slotProps={{ htmlInput: { maxLength: 80 } }}
        />
      ),
    }])),
    maxAttempts: {
      label: 'Número de tentativas de acesso',
      value: settings.maxAttempts,
      render: () => (
        <TextField
          required
          fullWidth
          size="small"
          type="number"
          label="Número de tentativas de acesso"
          value={settings.maxAttempts}
          onChange={(event) => changeSetting('maxAttempts', numberValue(event.target.value))}
          disabled={saving}
          slotProps={{ htmlInput: { min: 1, max: 20 } }}
        />
      ),
    },
    ...Object.fromEntries(ruleFields.map(({ key, label }) => [key, {
      label,
      value: settings[key],
      render: () => (
        <TextField
          required
          fullWidth
          size="small"
          type="number"
          label={label}
          value={settings[key]}
          onChange={(event) => changeSetting(key, numberValue(event.target.value))}
          disabled={saving}
          slotProps={{ htmlInput: { min: key === 'maxLength' ? 1 : 0, max: 64 } }}
        />
      ),
    }])),
    staff: {
      label: 'Funcionários',
      value: timeRange('staffAccessStart', 'staffAccessEnd'),
      render: () => (
        <div className="cacoin-settings-grid">
          <TimeField
            label="De"
            value={settings.staffAccessStart}
            onChange={(value) => changeSetting('staffAccessStart', value)}
            disabled={saving}
          />
          <TimeField
            label="Até"
            value={settings.staffAccessEnd}
            onChange={(value) => changeSetting('staffAccessEnd', value)}
            disabled={saving}
          />
        </div>
      ),
    },
    student: {
      label: 'Estudantes',
      value: timeRange('studentAccessStart', 'studentAccessEnd'),
      render: () => (
        <div className="cacoin-settings-grid">
          <TimeField
            label="De"
            value={settings.studentAccessStart}
            onChange={(value) => changeSetting('studentAccessStart', value)}
            disabled={saving}
          />
          <TimeField
            label="Até"
            value={settings.studentAccessEnd}
            onChange={(value) => changeSetting('studentAccessEnd', value)}
            disabled={saving}
          />
        </div>
      ),
    },
  };
  const settingKeys = mode === 'access'
    ? ['maxAttempts', 'staff', 'student']
    : [...characterFields.map(({ key }) => key), 'maxAttempts', ...ruleFields.map(({ key }) => key)];
  const settingsTable = (
    <>
      <SettingsValuesTable
        ariaLabel={page.title}
        columns={['Definição', 'Valor']}
        loading={loading}
        disabled={saving}
        rows={settingKeys.map((key) => ({
          key,
          label: settingItems[key].label,
          cells: [settingItems[key].label, settingItems[key].value],
          onEdit: () => {
            setError('');
            setEditingSetting(key);
          },
        }))}
      />
      <SettingsFormDialog
        open={Boolean(editingSetting)}
        title={settingItems[editingSetting]?.label ?? ''}
        onClose={() => { setEditingSetting(null); load(); }}
        onSubmit={saveSettings}
        saving={saving}
        error={error}
        maxWidth="xs"
      >
        {editingSetting && settingItems[editingSetting].render()}
      </SettingsFormDialog>
    </>
  );

  return (
    <section className="cacoin-course-page cacoin-settings-page cacoin-test-settings-page">
      <header className="cacoin-page-heading">
        <div>
          <h1><Icon size={23} aria-hidden="true" /> {page.title}</h1>
        </div>
      </header>
      {mode !== 'statuses' && error && !adminOpen && !editingSetting && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}
      {mode !== 'statuses' && notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>
      )}

      {mode === 'statuses' && <StatusSettingsTable groups={statusGroups} />}

      {mode === 'admins' && (
        <>
          <div className="cacoin-status-table-heading">
            <div className="cacoin-settings-section-heading">
              <ShieldCheck size={20} />
              <div>
                <h2>Administradores</h2>
              </div>
            </div>
            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={16} />}
              disabled={loading || saving}
              onClick={openNewAdmin}
            >
              Novo administrador
            </Button>
          </div>
          <StandardTable
            audit="UserAccount"
            ariaLabel="Administradores do sistema"
            columns={adminColumns}
            emptyMessage="Ainda não existem administradores."
            loading={loading}
            rows={admins}
            renderRow={(row, rowNumber) => (
              <TableRow key={row.id} hover>
                <TableCell>{rowNumber}</TableCell>
                <TableCell>{row.code}</TableCell>
                <TableCell>{displayText(row.name)}</TableCell>
                <TableCell>{formatDate(row.createdAt)}</TableCell>
                <TableCell>{accessWindow(row)}</TableCell>
                <TableCell>{displayText(row.notes)}</TableCell>
                <TableCell><StatusBadge label={row.statusLabel} tone={row.statusTone} /></TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <span>
                      <IconButton aria-label={`Editar ${row.code}`} disabled={saving} onClick={() => edit(row)}>
                        <Pencil size={17} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {row.status === 'ACTIVE' && (
                    <Tooltip title="Desactivar">
                      <span>
                        <IconButton
                          className="cacoin-table-action-delete"
                          aria-label={`Desactivar ${row.code}`}
                          disabled={saving}
                          onClick={() => runAction(row, 'deactivation', 'Administrador desactivado.')}
                        >
                          <Ban size={17} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  {(row.status === 'INACTIVE' || row.status === 'FINISHED') && (
                    <Tooltip title="Activar">
                      <span>
                        <IconButton
                          className="cacoin-table-action-activate"
                          aria-label={`Activar ${row.code}`}
                          disabled={saving}
                          onClick={() => runAction(row, 'activation', 'Administrador activado.')}
                        >
                          <CircleCheck size={17} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  {row.status === 'LOCKED' && (
                    <Tooltip title="Desbloquear">
                      <span>
                        <IconButton
                          className="cacoin-table-action-activate"
                          aria-label={`Desbloquear ${row.code}`}
                          disabled={saving}
                          onClick={() => runAction(row, 'unlock', 'Administrador desbloqueado.')}
                        >
                          <LockOpen size={17} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  <Tooltip title="Repor palavra-passe">
                    <span>
                      <IconButton
                        aria-label={`Repor palavra-passe ${row.code}`}
                        disabled={saving}
                        onClick={() => runAction(row, 'password-reset', 'Palavra-passe reposta.')}
                      >
                        <KeyRound size={17} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )}
          />
          <SettingsFormDialog
            open={adminOpen}
            title={editingId ? 'Editar Administrador' : 'Novo Administrador'}
            onClose={resetAdminForm}
            onSubmit={saveAdmin}
            saving={saving}
            error={error}
            submitLabel={editingId ? 'Guardar alterações' : 'Criar administrador'}
          >
        <div className="cacoin-settings-grid">
          <TextField
            required
            fullWidth
            size="small"
            label="Nome"
            value={admin.firstName}
            onChange={(event) => setAdmin((current) => ({ ...current, firstName: event.target.value }))}
            disabled={saving}
          />
          <TextField
            required
            fullWidth
            size="small"
            label="Apelido"
            value={admin.surname}
            onChange={(event) => setAdmin((current) => ({ ...current, surname: event.target.value }))}
            disabled={saving}
          />
          <TextField
            select
            fullWidth
            size="small"
            label="Data e Hora de Acesso"
            value={custom ? 'custom' : '24h'}
            onChange={(event) => setCustom(event.target.value === 'custom')}
            disabled={saving}
          >
            <MenuItem value="24h">24H</MenuItem>
            <MenuItem value="custom">Definir horas</MenuItem>
          </TextField>
          <TextField
            fullWidth
            size="small"
            label="Observação"
            value={admin.notes}
            onChange={(event) => setAdmin((current) => ({ ...current, notes: event.target.value }))}
            disabled={saving}
          />
          {custom && (
            <>
              <TimeField
                label="De"
                value={admin.accessStart}
                onChange={(value) => setAdmin((current) => ({ ...current, accessStart: value }))}
                disabled={saving}
              />
              <TimeField
                label="Até"
                value={admin.accessEnd}
                onChange={(value) => setAdmin((current) => ({ ...current, accessEnd: value }))}
                disabled={saving}
              />
            </>
          )}
        </div>
          </SettingsFormDialog>
        </>
      )}

      {(mode === 'password' || mode === 'access') && settingsTable}

      <Dialog
        open={Boolean(credential)}
        onClose={(event, reason) => {
          // Na configuração inicial só o botão «Fechar» fecha: a palavra-passe não se mostra outra vez.
          if (firstSetup && reason) return;
          closeCredential();
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Palavra-passe temporária</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            size="small"
            label="Código"
            value={credential?.account.code ?? ''}
            slotProps={{ input: { readOnly: true } }}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            size="small"
            label="Palavra-passe"
            value={credential?.temporaryPassword ?? ''}
            slotProps={{ input: { readOnly: true } }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={closeCredential}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
