import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TableCell,
  TableRow,
  Tooltip,
} from '@mui/material';
import { Ban, CircleCheck, KeyRound, LockOpen, UserX } from 'lucide-react';
import DataExportMenu from '../../components/DataExportMenu';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import StatusBadge from '../../components/StatusBadge';
import { applyUserAccountAction, getUserAccounts } from '../../services/api';
import { displayText } from '../../utils/displayText';
import { filterBySearch } from '../../utils/search';
import { errorMessage, formatDateTime, userStatusCodes } from './userUtils';

const studentColumns = [
  { key: 'code', label: 'Código do Estudante' },
  { key: 'name', label: 'Nome' },
  { key: 'courseName', label: 'Curso' },
  { key: 'categoryName', label: 'Categoria' },
  { key: 'levelName', label: 'Nível' },
  { key: 'modalityName', label: 'Modalidade' },
  { key: 'statusLabel', label: 'Estado' },
];
const staffColumns = [
  { key: 'code', label: 'Código do Funcionário' },
  { key: 'name', label: 'Nome' },
  { key: 'position', label: 'Cargo' },
  { key: 'statusLabel', label: 'Estado' },
];
const extraColumns = {
  active: [
    { key: 'lastAccessAt', label: 'Data & Hora de Último Acesso' },
    { key: 'failedAttempts', label: 'Tentativas de Acesso' },
  ],
  inactive: [{ key: 'deactivatedAt', label: 'Data de Desactivação' }],
  locked: [{ key: 'lockedAt', label: 'Data de Autobloqueio' }],
  finished: [{ key: 'finishedAt', label: 'Data de Término' }],
};
const titles = {
  active: 'Activos',
  inactive: 'Inactivos',
  locked: 'Autobloqueio',
  finished: 'Terminados',
};
const actionsColumn = { key: 'actions', label: 'Acções', align: 'right' };
const operations = {
  reset: { action: 'password-reset', title: 'Repor palavra-passe', icon: KeyRound, message: 'Palavra-passe reposta.' },
  deactivate: { action: 'deactivation', title: 'Desactivar', icon: Ban, message: 'Conta desactivada.' },
  terminate: { action: 'termination', title: 'Terminar', icon: UserX, message: 'Conta terminada.' },
  activate: { action: 'activation', title: 'Activar', icon: CircleCheck, message: 'Conta activada.' },
  unlock: { action: 'unlock', title: 'Desbloquear', icon: LockOpen, message: 'Conta desbloqueada.' },
};
const statusOperations = {
  active: ['reset', 'deactivate', 'terminate'],
  inactive: ['activate', 'terminate'],
  locked: ['unlock', 'terminate'],
  finished: ['activate'],
};

const formatCell = (row, key) => {
  if (key === 'statusLabel') return <StatusBadge label={row.statusLabel} tone={row.statusTone} />;
  if (['lastAccessAt', 'deactivatedAt', 'lockedAt', 'finishedAt'].includes(key)) {
    return formatDateTime(row[key]);
  }
  if (key === 'failedAttempts') return row.failedAttempts;
  if (key === 'code') return row.code;
  return displayText(row[key]);
};

export default function UserAccountsPage({ kind, status }) {
  const isStudent = kind === 'STUDENT';
  const columns = [...(isStudent ? studentColumns : staffColumns), ...extraColumns[status]];
  const [accounts, setAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setAccounts(await getUserAccounts(kind));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    load();
  }, [load]);

  const confirm = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await applyUserAccountAction(pending.account.id, pending.operation.action);
      setNotice(`${pending.operation.message} ${pending.account.code}`);
      setPending(null);
      await load();
    } catch (actionError) {
      setError(errorMessage(actionError));
      setPending(null);
    } finally {
      setSaving(false);
    }
  };

  const rows = useMemo(() => filterBySearch(
    accounts.filter((item) => item.status === userStatusCodes[status]),
    searchTerm,
    (item) => [item.code],
  ), [accounts, status, searchTerm]);
  const exportRows = rows.map((item) => Object.fromEntries(columns.map(({ key }) => [
    key,
    key === 'statusLabel' ? item.statusLabel : formatCell(item, key),
  ])));
  const title = titles[status];

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Usuários</p>
          <h1>{title}</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <DataExportMenu
            columns={columns}
            rows={exportRows}
            filename={`usuarios-${isStudent ? 'alunos' : 'funcionarios'}-${status}`}
            title={`${isStudent ? 'Alunos' : 'Funcionários'} — ${title}`}
            disabled={loading}
            onError={(exportError) => setError(errorMessage(exportError))}
          />
        </div>
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <StandardTable
        audit="UserAccount"
        ariaLabel={`Contas — ${title}`}
        columns={[...columns, actionsColumn]}
        emptyMessage={error
          ? 'Não foi possível carregar os dados.'
          : searchTerm.trim() ? 'Nenhum registo corresponde à pesquisa.' : 'Ainda não existem contas neste estado.'}
        loading={loading}
        rows={rows}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.id} hover>
            <TableCell>{rowNumber}</TableCell>
            {columns.map(({ key }) => <TableCell key={key}>{formatCell(row, key)}</TableCell>)}
            <TableCell align="right">
              {statusOperations[status].map((name) => {
                const operation = operations[name];
                const Icon = operation.icon;
                return (
                  <Tooltip key={name} title={operation.title}>
                    <span>
                      <IconButton
                        className={name === 'activate' || name === 'unlock'
                          ? 'cacoin-table-action-activate'
                          : name === 'deactivate' || name === 'terminate'
                            ? 'cacoin-table-action-delete'
                            : undefined}
                        aria-label={`${operation.title} ${row.code}`}
                        disabled={saving}
                        onClick={() => setPending({ account: row, operation })}
                      >
                        <Icon size={17} />
                      </IconButton>
                    </span>
                  </Tooltip>
                );
              })}
            </TableCell>
          </TableRow>
        )}
      />
      <Dialog open={Boolean(pending)} onClose={() => !saving && setPending(null)}>
        <DialogTitle>{pending?.operation.title} — {pending?.account.code}</DialogTitle>
        <DialogContent>{displayText(pending?.account.name)}</DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={confirm} disabled={saving}>
            {saving ? 'A processar…' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
