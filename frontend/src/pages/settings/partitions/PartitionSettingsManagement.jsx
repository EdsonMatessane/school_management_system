import { useCallback, useEffect, useState } from 'react';
import { Eye, KeyRound, Power, Split, UserPlus } from 'lucide-react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Tab,
  Tabs,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import DetailList from '../../../components/DetailList';
import SettingsFormDialog from '../../../components/SettingsFormDialog';
import StandardTable from '../../../components/StandardTable';
import StatusBadge from '../../../components/StatusBadge';
import {
  activatePartition,
  createPartition,
  createPartitionAdmin,
  deactivatePartition,
  getPartitionMigrationScopes,
  getPartitions,
  resetPartitionAdmin,
  migratePartitionData,
} from '../../../services/api';
import { toDisplayDateTime } from '../../../utils/date';

const errorMessage = (error) => (
  error.response?.data?.message
  || error.message
  || 'Não foi possível concluir a operação.'
);

const empty = { institutionName: '', address: '', databaseName: '' };
const emptyAdmin = { firstName: '', surname: '', accessStart: '', accessEnd: '', notes: '' };

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
const tableLabels = {
  system_settings: 'Definições do sistema',
  school_holidays: 'Feriados',
  system_statuses: 'Estados',
  payment_methods: 'Métodos de pagamento',
  payment_period_settings: 'Período de pagamento',
  fine_settings: 'Multas',
  test_settings: 'Testes',
  exam_settings: 'Exames',
  uniform_settings: 'Fardamento (definição)',
  uniform_stock: 'Fardamento (stock)',
  graduation_settings: 'Graduação (definição)',
  graduation_requirements: 'Graduação (requisitos)',
  suspension_settings: 'Trancamentos',
  pauta_settings: 'Pautas',
  online_attendance_settings: 'Presenças',
  online_class_platform_settings: 'Aulas online',
  student_request_settings: 'Pedidos (definição)',
  student_request_types: 'Tipos de pedidos',
  leave_settings: 'Pedidos de saída',
  notification_settings: 'Notificações',
  finance_settings: 'Finanças (regras)',
  finance_positions: 'Cargos',
  finance_salary_types: 'Tipos de salário',
  finance_bonus_types: 'Tipos de bónus',
  expense_catalog_items: 'Catálogo de despesas',
  mobile_money_wallets: 'Carteiras Mobile Money',
  mobile_money_bank_accounts: 'Contas bancárias',
  user_settings: 'Regras de utilizadores',
  course_categories: 'Categorias',
  course_levels: 'Níveis',
  course_modalities: 'Modalidades',
  course_monthly_fees: 'Mensalidades',
  course_enrollment_fees: 'Taxas de inscrição',
  course_manual_fees: 'Taxas de manual',
  courses: 'Cursos',
  course_modules: 'Módulos',
  course_disciplines: 'Disciplinas',
};
const statusLabels = { ACTIVE: 'Activo', STARTING: 'A arrancar', INACTIVE: 'Inactivo' };

/**
 * Separador de migração (Configurações ou Gestão de Cursos): copia os dados do sistema
 * principal para a repartição, com o mesmo formato, e mostra o que foi copiado.
 */
function MigrationTab({ partition, scope, disabled }) {
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setRunning(true);
    setError('');
    try {
      setResult(await migratePartitionData(partition.id, scope.id));
    } catch (migrationError) {
      setResult(null);
      setError(errorMessage(migrationError));
    } finally {
      setRunning(false);
      setConfirming(false);
    }
  };

  const rows = result?.tables ?? scope.tables;
  return (
    <div>
      <p style={{ marginTop: 0 }}>{scope.description}</p>
      {disabled && (
        <Alert severity="info" sx={{ mb: 2 }}>
          A repartição tem de estar activa e já arrancada para receber dados.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {result && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Migração concluída: {result.total} registo(s) copiado(s) para «{partition.institutionName}».
        </Alert>
      )}
      <DetailList
        rows={rows.map((item) => [
          tableLabels[item.table] || item.table,
          `${item.rows} registo(s)${result ? ' copiado(s)' : ' a migrar'}`,
        ])}
      />
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          disabled={disabled || running}
          onClick={() => setConfirming(true)}
        >
          Migrar {scope.label}
        </Button>
      </div>
      <Dialog open={confirming} onClose={() => !running && setConfirming(false)} fullWidth maxWidth="xs">
        <DialogTitle>Migrar {scope.label}</DialogTitle>
        <DialogContent>
          Copiar {scope.label} do sistema principal para «{partition.institutionName}»? Os dados
          de {scope.label} que a repartição já tiver serão substituídos pelos do sistema principal.
          Se algo falhar, nada é alterado.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)} disabled={running}>Cancelar</Button>
          <Button variant="contained" onClick={run} disabled={running}>
            {running ? 'A migrar…' : 'Migrar'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

/**
 * Configurações > Repartição: cria um sistema independente (base de dados nova e vazia, sem
 * utilizadores). Num sistema repartido tudo fica desactivado.
 */
export default function PartitionSettingsManagement() {
  const [status, setStatus] = useState({ allowed: true, items: [] });
  const [form, setForm] = useState(empty);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [viewing, setViewing] = useState(null);
  const [viewTab, setViewTab] = useState(0);
  const [scopes, setScopes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminTarget, setAdminTarget] = useState(null);
  const [admin, setAdmin] = useState(emptyAdmin);
  const [adminCustom, setAdminCustom] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [credential, setCredential] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const disabled = !status.allowed;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setStatus(await getPartitions());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDetails = async (row) => {
    setViewTab(0);
    setViewing(row);
    try {
      setScopes(await getPartitionMigrationScopes());
    } catch (scopeError) {
      setError(errorMessage(scopeError));
    }
  };

  const change = (field) => (event) => setForm((current) => ({
    ...current,
    [field]: field === 'databaseName'
      ? event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
      : event.target.value,
  }));

  const ready = form.institutionName.trim() && form.address.trim() && form.databaseName.trim();

  const toggle = async (row) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await (row.active ? deactivatePartition(row.id) : activatePartition(row.id));
      setNotice(row.active ? 'Repartição desactivada.' : 'Repartição activada.');
      await load();
    } catch (toggleError) {
      setError(errorMessage(toggleError));
    } finally {
      setSaving(false);
    }
  };

  const openAdmin = (partition) => {
    setAdmin(emptyAdmin);
    setAdminCustom(false);
    setAdminError('');
    setAdminTarget(partition);
  };

  const closeReset = () => {
    setResetTarget(null);
    setResetPassword('');
    setResetError('');
  };

  const submitReset = async () => {
    setResetSaving(true);
    setResetError('');
    try {
      const result = await resetPartitionAdmin(resetTarget.id, resetPassword);
      setCredential({
        institutionName: resetTarget.institutionName,
        code: result.code,
        temporaryPassword: result.temporaryPassword,
      });
      closeReset();
    } catch (resetFailure) {
      setResetError(errorMessage(resetFailure));
    } finally {
      setResetSaving(false);
    }
  };

  const closeAdmin = () => {
    setAdminTarget(null);
    setAdmin(emptyAdmin);
    setAdminCustom(false);
    setAdminError('');
  };

  const submitAdmin = async (event) => {
    event.preventDefault();
    setAdminSaving(true);
    setAdminError('');
    try {
      const created = await createPartitionAdmin(adminTarget.id, {
        ...admin,
        accessStart: adminCustom ? admin.accessStart : '',
        accessEnd: adminCustom ? admin.accessEnd : '',
      });
      setCredential({
        institutionName: adminTarget.institutionName,
        code: created.account?.code,
        temporaryPassword: created.temporaryPassword,
      });
      setNotice(`Administrador criado em «${adminTarget.institutionName}».`);
      closeAdmin();
      await load();
    } catch (adminSaveError) {
      setAdminError(errorMessage(adminSaveError));
    } finally {
      setAdminSaving(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const created = await createPartition({ ...form, password });
      setConfirming(false);
      setPassword('');
      setPasswordError('');
      setForm(empty);
      setNotice('Sistema repartido. Crie agora o primeiro administrador para poder entrar.');
      openAdmin(created);
      await load();
    } catch (saveError) {
      if (saveError.response?.status === 403) {
        setPasswordError(errorMessage(saveError));
      } else {
        setConfirming(false);
        setPassword('');
        setError(errorMessage(saveError));
      }
    } finally {
      setSaving(false);
    }
  };

  const closeConfirm = () => {
    setConfirming(false);
    setPassword('');
    setPasswordError('');
  };

  return (
    <section className="cacoin-course-page cacoin-settings-page cacoin-test-settings-page">
      <header className="cacoin-page-heading">
        <div>
          <h1><Split size={23} aria-hidden="true" /> Repartição</h1>
        </div>
      </header>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

      <section className="cacoin-settings-card">
        <form
          className="cacoin-test-registration-form"
          onSubmit={(event) => {
            event.preventDefault();
            setPasswordError('');
            setConfirming(true);
          }}
        >
          <TextField
            required
            size="small"
            label="Nome da instituição"
            value={form.institutionName}
            onChange={change('institutionName')}
            disabled={disabled || saving}
          />
          <TextField
            required
            size="small"
            label="Endereço"
            value={form.address}
            onChange={change('address')}
            disabled={disabled || saving}
          />
          <TextField
            required
            size="small"
            label="Nome da base de dados"
            value={form.databaseName}
            onChange={change('databaseName')}
            disabled={disabled || saving}
          />
          <div className="cacoin-test-registration-actions">
            <Button type="submit" variant="contained" disabled={disabled || saving || !ready}>
              Repartir
            </Button>
          </div>
        </form>
      </section>

      <StandardTable
        ariaLabel="Repartições existentes"
        columns={[
          { key: 'institutionName', label: 'Nome da instituição' },
          { key: 'address', label: 'Endereço' },
          { key: 'databaseName', label: 'Base de dados' },
          { key: 'createdAt', label: 'Criada em' },
          { key: 'status', label: 'Estado' },
          { key: 'actions', label: 'Acções', align: 'right' },
        ]}
        emptyMessage="Ainda não existem repartições."
        loading={loading}
        rows={status.items}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{row.institutionName}</TableCell>
            <TableCell>{row.address}</TableCell>
            <TableCell>{row.databaseName}</TableCell>
            <TableCell>{toDisplayDateTime(row.createdAt) || '—'}</TableCell>
            <TableCell>
              <StatusBadge
                label={statusLabels[row.status]}
                tone={row.status === 'ACTIVE' ? 'paid' : row.status === 'STARTING' ? 'pending' : 'rejected'}
              />
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Ver">
                <IconButton aria-label={`Ver ${row.institutionName}`} onClick={() => openDetails(row)}>
                  <Eye size={17} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Criar administrador">
                <span>
                  <IconButton
                    aria-label={`Criar administrador de ${row.institutionName}`}
                    disabled={disabled || saving || !row.active}
                    onClick={() => openAdmin(row)}
                  >
                    <UserPlus size={17} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Repor acesso do administrador">
                <span>
                  <IconButton
                    aria-label={`Repor acesso do administrador de ${row.institutionName}`}
                    disabled={disabled || saving}
                    onClick={() => { setResetPassword(''); setResetError(''); setResetTarget(row); }}
                  >
                    <KeyRound size={17} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={row.active ? 'Desactivar' : 'Activar'}>
                <span>
                  <IconButton
                    aria-label={`${row.active ? 'Desactivar' : 'Activar'} ${row.institutionName}`}
                    disabled={disabled || saving}
                    onClick={() => toggle(row)}
                  >
                    <Power size={17} />
                  </IconButton>
                </span>
              </Tooltip>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} fullWidth maxWidth="md">
        <DialogTitle>Repartição — {viewing?.institutionName}</DialogTitle>
        <DialogContent>
          {viewing && (
            <>
              <Tabs
                className="cacoin-settings-tabs"
                value={viewTab}
                onChange={(_, value) => setViewTab(value)}
                sx={{ mb: 2 }}
              >
                <Tab label="Detalhes" />
                <Tab label="Configurações" />
                <Tab label="Gestão de Cursos" />
              </Tabs>
              {viewTab === 0 && (
                <DetailList
                  rows={[
                    ['Nome da instituição', viewing.institutionName],
                    ['Endereço', viewing.address],
                    ['Base de dados', viewing.databaseName],
                    ['Estado', statusLabels[viewing.status]],
                    ['Porta', viewing.port ?? '—'],
                    ['Endereço de acesso', `${window.location.protocol}//${window.location.hostname}:${viewing.port}/api`],
                    ['Ligação à base de dados', viewing.startupUrl],
                    ['Criada em', toDisplayDateTime(viewing.createdAt) || '—'],
                  ]}
                />
              )}
              {viewTab > 0 && (() => {
                const scope = scopes.find(
                  (item) => item.id === (viewTab === 1 ? 'CONFIGURATIONS' : 'COURSES'),
                );
                return scope ? (
                  <MigrationTab
                    key={`${viewing.id}-${scope.id}`}
                    partition={viewing}
                    scope={scope}
                    disabled={disabled || viewing.status !== 'ACTIVE'}
                  />
                ) : <p>A carregar…</p>;
              })()}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewing(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirming} onClose={() => !saving && closeConfirm()} fullWidth maxWidth="xs">
        <DialogTitle>Repartir o sistema</DialogTitle>
        <DialogContent>
          Criar o sistema independente «{form.institutionName.trim()}» na base de dados
          «{form.databaseName.trim()}»? Fica completamente vazio, sem utilizadores.
          {passwordError && <Alert severity="error" sx={{ mt: 2 }}>{passwordError}</Alert>}
          <TextField
            autoFocus
            fullWidth
            size="small"
            type="password"
            label="Palavra-passe"
            autoComplete="off"
            value={password}
            onChange={(event) => { setPassword(event.target.value); setPasswordError(''); }}
            onKeyDown={(event) => { if (event.key === 'Enter' && password && !saving) submit(); }}
            disabled={saving}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={submit} disabled={saving || !password}>
            {saving ? 'A repartir…' : 'Repartir'}
          </Button>
        </DialogActions>
      </Dialog>

      <SettingsFormDialog
        open={Boolean(adminTarget)}
        title="Novo Administrador"
        onClose={closeAdmin}
        onSubmit={submitAdmin}
        saving={adminSaving}
        error={adminError}
        submitLabel="Criar administrador"
      >
        <div className="cacoin-settings-grid">
          <TextField
            required
            fullWidth
            size="small"
            label="Nome"
            value={admin.firstName}
            onChange={(event) => setAdmin((current) => ({ ...current, firstName: event.target.value }))}
            disabled={adminSaving}
          />
          <TextField
            required
            fullWidth
            size="small"
            label="Apelido"
            value={admin.surname}
            onChange={(event) => setAdmin((current) => ({ ...current, surname: event.target.value }))}
            disabled={adminSaving}
          />
          <TextField
            select
            fullWidth
            size="small"
            label="Data e Hora de Acesso"
            value={adminCustom ? 'custom' : '24h'}
            onChange={(event) => setAdminCustom(event.target.value === 'custom')}
            disabled={adminSaving}
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
            disabled={adminSaving}
          />
          {adminCustom && (
            <>
              <TimeField
                label="De"
                value={admin.accessStart}
                onChange={(value) => setAdmin((current) => ({ ...current, accessStart: value }))}
                disabled={adminSaving}
              />
              <TimeField
                label="Até"
                value={admin.accessEnd}
                onChange={(value) => setAdmin((current) => ({ ...current, accessEnd: value }))}
                disabled={adminSaving}
              />
            </>
          )}
        </div>
      </SettingsFormDialog>

      <Dialog open={Boolean(resetTarget)} onClose={() => !resetSaving && closeReset()} fullWidth maxWidth="xs">
        <DialogTitle>Repor acesso do administrador</DialogTitle>
        <DialogContent>
          Desbloqueia o administrador de «{resetTarget?.institutionName}» e gera uma nova
          palavra-passe temporária.
          {resetError && <Alert severity="error" sx={{ mt: 2 }}>{resetError}</Alert>}
          <TextField
            autoFocus
            fullWidth
            size="small"
            type="password"
            label="Palavra-passe"
            autoComplete="off"
            value={resetPassword}
            onChange={(event) => { setResetPassword(event.target.value); setResetError(''); }}
            onKeyDown={(event) => { if (event.key === 'Enter' && resetPassword && !resetSaving) submitReset(); }}
            disabled={resetSaving}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReset} disabled={resetSaving}>Cancelar</Button>
          <Button variant="contained" onClick={submitReset} disabled={resetSaving || !resetPassword}>
            {resetSaving ? 'A repor…' : 'Repor acesso'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(credential)} onClose={() => setCredential(null)} fullWidth maxWidth="xs">
        <DialogTitle>Palavra-passe temporária</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            size="small"
            label="Código"
            value={credential?.code ?? ''}
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
          <Button variant="contained" onClick={() => setCredential(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
