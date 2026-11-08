import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  TableCell,
  TableRow,
  Tooltip,
} from '@mui/material';
import { Download, Eye, FileClock } from 'lucide-react';
import SearchField from '../../../components/SearchField';
import StandardTable from '../../../components/StandardTable';
import StatusBadge from '../../../components/StatusBadge';
import { getAuditLogs, getAuditUsers } from '../../../services/api';
import { displayText } from '../../../utils/displayText';
import { filterBySearch } from '../../../utils/search';
import { errorMessage, formatDateTime } from '../../users/userUtils';
import { actionLabels, describeChanges, entityLabels } from './auditLabels';

const formats = [
  { id: 'pdf', label: 'Exportar PDF' },
  { id: 'excel', label: 'Exportar Excel' },
  { id: 'csv', label: 'Exportar CSV' },
  { id: 'xml', label: 'Exportar XML' },
];
const kindLabels = { ADMIN: 'Administrador', STAFF: 'Funcionário' };
const userColumns = [
  { key: 'code', label: 'Código' },
  { key: 'name', label: 'Nome' },
  { key: 'kind', label: 'Tipo' },
  { key: 'position', label: 'Cargo' },
  { key: 'logCount', label: 'Registos' },
  { key: 'lastLogAt', label: 'Último Registo' },
  { key: 'actions', label: 'Acções', align: 'right' },
];
const logColumns = [
  { key: 'createdAt', label: 'Data & Hora' },
  { key: 'action', label: 'Acção' },
  { key: 'entity', label: 'Entidade' },
  { key: 'entityRef', label: 'Registo' },
  { key: 'changes', label: 'Alterações' },
];
const exportColumns = [
  { key: 'createdAt', label: 'Data & Hora' },
  { key: 'actorCode', label: 'Código' },
  { key: 'actorName', label: 'Nome' },
  { key: 'action', label: 'Acção' },
  { key: 'entity', label: 'Entidade' },
  { key: 'entityRef', label: 'Registo' },
  { key: 'changes', label: 'Alterações', multiline: true },
];

const entityLabel = (name) => entityLabels[name] ?? name;
const logChanges = (log) => (log.action === 'UPDATE' ? describeChanges(log.changes) : []);
const exportRow = (log) => ({
  createdAt: formatDateTime(log.createdAt),
  actorCode: log.actorCode,
  actorName: displayText(log.actorName),
  action: actionLabels[log.action] ?? log.action,
  entity: entityLabel(log.entity),
  entityRef: log.entityRef || '—',
  changes: logChanges(log).join('\n'),
});

function LogExport({ load, filename, title, label, iconOnly = false, disabled = false, onError }) {
  const [anchor, setAnchor] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async (format) => {
    setBusy(true);
    try {
      const rows = (await load()).map(exportRow);
      const options = {
        columns: [{ key: 'reportRowNumber', label: 'N.º' }, ...exportColumns],
        rows: rows.map((row, index) => ({ ...row, reportRowNumber: index + 1 })),
        filename,
        title,
      };
      const exporters = await import('../../../utils/dataExport');
      if (format === 'pdf') exporters.exportTableToPdf(options);
      if (format === 'excel') exporters.exportTableToExcel(options);
      if (format === 'csv') exporters.exportTableToCsv(options);
      if (format === 'xml') exporters.exportTableToXml(options);
    } catch (error) {
      onError?.(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {iconOnly ? (
        <Tooltip title={label}>
          <span>
            <IconButton
              aria-label={label}
              disabled={disabled || busy}
              onClick={(event) => setAnchor(event.currentTarget)}
            >
              <Download size={17} />
            </IconButton>
          </span>
        </Tooltip>
      ) : (
        <Button
          variant="outlined"
          startIcon={<Download size={17} />}
          disabled={disabled || busy}
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          {label}
        </Button>
      )}
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {formats.map(({ id, label: formatLabel }) => (
          <MenuItem
            key={id}
            onClick={() => {
              setAnchor(null);
              run(id);
            }}
          >
            {formatLabel}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default function UserLogsManagement() {
  const [users, setUsers] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(await getAuditUsers());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const view = async (user) => {
    setViewing(user);
    setLogs([]);
    setLoadingLogs(true);
    try {
      setLogs(await getAuditLogs(user.accountId));
    } catch (loadError) {
      setError(errorMessage(loadError));
      setViewing(null);
    } finally {
      setLoadingLogs(false);
    }
  };

  const rows = useMemo(
    () => filterBySearch(users, searchTerm, (item) => [item.code, item.name]),
    [users, searchTerm],
  );

  return (
    <section className="cacoin-course-page cacoin-settings-page cacoin-test-settings-page">
      <header className="cacoin-page-heading">
        <div>
          <h1><FileClock size={23} aria-hidden="true" /> User Logs</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <LogExport
            load={() => getAuditLogs()}
            filename="user-logs"
            title="User Logs"
            label="Extrair todos"
            disabled={loading}
            onError={(exportError) => setError(errorMessage(exportError))}
          />
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <StandardTable
        ariaLabel="Utilizadores com logs"
        columns={userColumns}
        emptyMessage={error
          ? 'Não foi possível carregar os dados.'
          : searchTerm.trim() ? 'Nenhum registo corresponde à pesquisa.' : 'Ainda não existem utilizadores.'}
        loading={loading}
        rows={rows}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.accountId} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{row.code}</TableCell>
            <TableCell>{displayText(row.name)}</TableCell>
            <TableCell>{kindLabels[row.kind] ?? row.kind}</TableCell>
            <TableCell>{displayText(row.position)}</TableCell>
            <TableCell>{row.logCount}</TableCell>
            <TableCell>{formatDateTime(row.lastLogAt)}</TableCell>
            <TableCell align="right">
              <Tooltip title="Ver">
                <span>
                  <IconButton aria-label={`Ver logs de ${row.code}`} onClick={() => view(row)}>
                    <Eye size={17} />
                  </IconButton>
                </span>
              </Tooltip>
              <LogExport
                iconOnly
                load={() => getAuditLogs(row.accountId)}
                filename={`logs-${row.code}`}
                title={`Logs — ${row.code} ${displayText(row.name)}`}
                label={`Extrair logs de ${row.code}`}
                onError={(exportError) => setError(errorMessage(exportError))}
              />
            </TableCell>
          </TableRow>
        )}
      />
      <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} fullWidth maxWidth="xl">
        <DialogTitle>Logs — {viewing?.code} {displayText(viewing?.name)}</DialogTitle>
        <DialogContent>
          <StandardTable
            ariaLabel="Logs do utilizador"
            columns={logColumns}
            emptyMessage="Ainda não existem logs."
            loading={loadingLogs}
            rows={logs}
            renderRow={(row, rowNumber) => (
              <TableRow key={row.id} hover>
                <TableCell>{rowNumber}</TableCell>
                <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                <TableCell>
                  <StatusBadge
                    label={actionLabels[row.action] ?? row.action}
                    tone={row.action === 'DELETE' ? 'rejected' : row.action === 'CREATE' ? 'paid' : 'pending'}
                  />
                </TableCell>
                <TableCell>{entityLabel(row.entity)}</TableCell>
                <TableCell>{row.entityRef || '—'}</TableCell>
                <TableCell>
                  {logChanges(row).map((line) => <div key={line}>{line}</div>)}
                </TableCell>
              </TableRow>
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewing(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
