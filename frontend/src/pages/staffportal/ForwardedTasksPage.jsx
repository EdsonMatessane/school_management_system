import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  IconButton,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { CheckCheck, Undo2, X } from 'lucide-react';
import Money from '../../components/Money';
import { RichTextCell } from '../../components/RichTextField';
import StandardTable from '../../components/StandardTable';
import StatusBadge from '../../components/StatusBadge';
import {
  concludeExpenseRecord,
  getForwardedRecords,
  resolveReturnRecord,
} from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { formatQuantity } from '../../utils/quantity';
import { richTextToPlain } from '../../utils/richText';
import { expenseConfigs } from '../expenses/expenseConfigs';
import { NotesCell, NotesDialogs } from '../expenses/RecordNotes';

const errorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.'
);

const kinds = [
  { kind: 'expenses', label: 'Despesas' },
  { kind: 'purchases', label: 'Compras' },
  { kind: 'sales', label: 'Vendas' },
  { kind: 'returns', label: 'Devoluções' },
];

const cellValue = (column, row, kind) => {
  const value = row[column.key];
  const trade = kind === 'purchases' || kind === 'returns';
  if (column.type === 'quantity') return formatQuantity(value, row.quantityUnit);
  if (trade && column.type === 'money' && value == null) return 'N/A';
  if (trade && column.type === 'rich' && !richTextToPlain(value)) return 'N/A';
  if (trade && column.type === undefined && !value) return 'N/A';
  if (column.type === 'money') return <Money value={value} />;
  if (column.type === 'rich') return <RichTextCell value={value} />;
  if (column.type === 'date') return value ? toDisplayDate(value) : '—';
  return displayText(value);
};

/** Registos que o administrador encaminhou ao funcionário: por fazer ou concluídos. */
export default function ForwardedTasksPage({ done = false }) {
  const [data, setData] = useState({ expenses: [], purchases: [], sales: [], returns: [] });
  const [kind, setKind] = useState('expenses');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [saving, setSaving] = useState(false);
  const [rejecting, setRejecting] = useState(null);
  const [rejection, setRejection] = useState('');
  const [rejectionError, setRejectionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getForwardedRecords());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const config = expenseConfigs[kind];
  const wanted = done ? 'DONE' : 'TODO';
  const rows = (data[kind] ?? []).filter((row) => row.forward?.status === wanted);
  const columns = [
    ...config.columns.filter((column) => column.type !== 'status'
      && !(column.key === 'rejectionReason' && !done)),
    { key: 'statusColumn', label: 'Estado', type: 'status' },
    { key: 'notes', label: 'Anotações' },
    ...(done ? [] : [{ key: 'actions', label: 'Acções', align: 'right' }]),
  ];

  const resolve = async (row, outcome, reason) => {
    setSaving(true);
    setError('');
    try {
      await resolveReturnRecord(row.id, outcome, reason);
      setRejecting(null);
      setConfirming(null);
      setNotice(outcome === 'REJECTED' ? 'Devolução rejeitada.' : 'Devolução marcada como devolvida.');
      await load();
    } catch (saveError) {
      const message = errorMessage(saveError);
      if (outcome === 'REJECTED') setRejectionError(message);
      else setError(message);
      setConfirming(null);
    } finally {
      setSaving(false);
    }
  };

  const conclude = async () => {
    if (kind === 'returns') {
      await resolve(confirming, 'RETURNED');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await concludeExpenseRecord(kind, confirming.id);
      setConfirming(null);
      setNotice('Registo concluído.');
      await load();
    } catch (saveError) {
      setError(errorMessage(saveError));
      setConfirming(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Encaminhadas</p>
          <h1>{done ? 'Concluído' : 'Por fazer'}</h1>
        </div>
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <div className="portal-tabs" role="tablist" aria-label="Tipo de registo" style={{ marginBottom: 12 }}>
        {kinds.map((item) => (
          <button
            key={item.kind}
            type="button"
            role="tab"
            aria-selected={item.kind === kind}
            className={`portal-tab${item.kind === kind ? ' active' : ''}`}
            onClick={() => setKind(item.kind)}
          >
            {item.label} ({(data[item.kind] ?? []).filter((row) => row.forward?.status === wanted).length})
          </button>
        ))}
      </div>
      <StandardTable
        ariaLabel={`${config.listTitle} encaminhadas`}
        columns={columns}
        emptyMessage={error ? 'Não foi possível carregar os dados.' : 'Não existem registos encaminhados.'}
        loading={loading}
        rows={rows}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.id} hover>
            <TableCell>{rowNumber}</TableCell>
            {columns.filter(({ key }) => !['statusColumn', 'notes', 'actions'].includes(key)).map((column) => (
              <TableCell key={column.key}>{cellValue(column, row, kind)}</TableCell>
            ))}
            <TableCell><StatusBadge label={row.statusLabel} tone={row.statusTone} /></TableCell>
            <TableCell><NotesCell row={row} onEdit={setEditing} onView={setViewing} /></TableCell>
            {!done && (
              <TableCell align="right">
                <Tooltip title={kind === 'returns' ? 'Devolvido' : 'Concluir'}>
                  <IconButton
                    aria-label={kind === 'returns' ? 'Devolvido' : 'Concluir'}
                    onClick={() => setConfirming(row)}
                  >
                    {kind === 'returns' ? <Undo2 size={17} /> : <CheckCheck size={17} />}
                  </IconButton>
                </Tooltip>
                {kind === 'returns' && (
                  <Tooltip title="Rejeitado">
                    <IconButton
                      aria-label="Rejeitado"
                      onClick={() => { setRejection(''); setRejectionError(''); setRejecting(row); }}
                    >
                      <X size={17} />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            )}
          </TableRow>
        )}
      />

      <NotesDialogs
        kind={kind}
        editing={editing}
        viewing={viewing}
        onCloseEdit={() => setEditing(null)}
        onCloseView={() => setViewing(null)}
        onSaved={() => {
          setEditing(null);
          setNotice('Anotações guardadas.');
          load();
        }}
      />

      <Dialog open={Boolean(confirming)} onClose={() => !saving && setConfirming(null)} fullWidth maxWidth="xs">
        <DialogTitle>{kind === 'returns' ? 'Devolvido' : 'Concluir'}</DialogTitle>
        <DialogContent>
          {kind === 'returns'
            ? 'Marcar como devolvido? Passa para Concluído.'
            : 'Concluir este registo? Passa para Concluído.'}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(null)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={conclude} disabled={saving}>Concluir</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(rejecting)} onClose={() => !saving && setRejecting(null)} fullWidth maxWidth="sm">
        <DialogTitle>Rejeitado</DialogTitle>
        <DialogContent>
          {rejectionError && <Alert severity="error" sx={{ mb: 1 }}>{rejectionError}</Alert>}
          <TextField
            required
            fullWidth
            multiline
            minRows={3}
            size="small"
            label="Motivo de rejeição"
            value={rejection}
            onChange={(event) => setRejection(event.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejecting(null)} disabled={saving}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            disabled={saving}
            onClick={() => {
              if (!rejection.trim()) {
                setRejectionError('Indique o motivo de rejeição.');
                return;
              }
              resolve(rejecting, 'REJECTED', rejection);
            }}
          >
            Rejeitar
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
