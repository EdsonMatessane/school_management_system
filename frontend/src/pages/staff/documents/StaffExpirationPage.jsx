import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { RefreshCw } from 'lucide-react';
import DataExportMenu from '../../../components/DataExportMenu';
import SearchField from '../../../components/SearchField';
import StandardTable from '../../../components/StandardTable';
import {
  getExpiredStaffDocuments,
  getExpiringStaffDocuments,
  renewStaffDocument,
} from '../../../services/api';
import { toDisplayDate } from '../../../utils/date';
import { displayText } from '../../../utils/displayText';
import { filterBySearch } from '../../../utils/search';
import { dayLabel, documentLabel, errorMessage } from './staffDocumentUtils';
import DateField from '../../../components/DateField';

const baseColumns = [
  { key: 'staffCode', label: 'Código do Funcionário' },
  { key: 'staffName', label: 'Nome' },
  { key: 'phone', label: 'Telefone' },
  { key: 'biNumber', label: 'BI' },
  { key: 'document', label: 'Documento' },
  { key: 'expiryDate', label: 'Data de Expiração' },
];

export default function StaffExpirationPage({ mode }) {
  const expired = mode === 'expired';
  const [rows, setRows] = useState([]);
  const [days, setDays] = useState(30);
  const [renewing, setRenewing] = useState(null);
  const [dates, setDates] = useState({ issueDate: '', expiryDate: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(expired ? await getExpiredStaffDocuments() : await getExpiringStaffDocuments(days));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [days, expired]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo(() => [
    ...baseColumns,
    { key: 'days', label: expired ? 'Dias após Expiração' : 'Dias para Expiração' },
    ...(expired ? [{ key: 'actions', label: 'Acções', align: 'right' }] : []),
  ], [expired]);
  const visible = useMemo(() => filterBySearch(rows, searchTerm, (row) => [
    row.staffCode,
    row.staffName,
    row.phone,
    row.biNumber,
    documentLabel({ typeName: row.typeName, description: row.description }),
  ]), [rows, searchTerm]);
  const exportColumns = columns.filter(({ key }) => key !== 'actions');
  const exportRows = visible.map((row) => ({
    staffCode: row.staffCode,
    staffName: displayText(row.staffName),
    phone: displayText(row.phone),
    biNumber: displayText(row.biNumber),
    document: documentLabel({ typeName: row.typeName, description: row.description }),
    expiryDate: toDisplayDate(row.expiryDate),
    days: Math.abs(row.days),
  }));

  const submitRenewal = async (event) => {
    event.preventDefault();
    if (!dates.issueDate || !dates.expiryDate || dates.expiryDate <= dates.issueDate) {
      setError('Indique a data de emissão e uma data de validade posterior.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await renewStaffDocument(renewing.documentId, dates);
      setNotice(`Documento de ${renewing.staffCode} renovado.`);
      setRenewing(null);
      await load();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Funcionários</p>
          <h1>{expired ? 'Expirados' : 'A Expirar'}</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          {!expired && (
            <TextField
              select
              size="small"
              label="Prazo"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              sx={{ minWidth: 130 }}
            >
              {[30, 60, 90, 180].map((value) => (
                <MenuItem key={value} value={value}>{value} dias</MenuItem>
              ))}
            </TextField>
          )}
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename={expired ? 'documentos-expirados' : 'documentos-a-expirar'}
            title={expired ? 'Documentos expirados' : 'Documentos a expirar'}
            disabled={loading}
            onError={(exportError) => setError(errorMessage(exportError))}
          />
        </div>
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && !renewing && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}
      <StandardTable
        audit={(row) => ({ entity: 'StaffDocument', id: row.documentId })}
        ariaLabel={expired ? 'Documentos expirados' : 'Documentos a expirar'}
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar os dados.'
          : searchTerm.trim()
            ? 'Nenhum registo corresponde à pesquisa.'
            : expired ? 'Não existem documentos expirados.' : 'Não existem documentos a expirar neste prazo.'}
        loading={loading}
        rows={visible}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.documentId} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{row.staffCode}</TableCell>
            <TableCell>{displayText(row.staffName)}</TableCell>
            <TableCell>{displayText(row.phone)}</TableCell>
            <TableCell>{displayText(row.biNumber)}</TableCell>
            <TableCell>{documentLabel({ typeName: row.typeName, description: row.description })}</TableCell>
            <TableCell>{toDisplayDate(row.expiryDate)}</TableCell>
            <TableCell>{dayLabel(row.days)}</TableCell>
            {expired && (
              <TableCell align="right">
                <Tooltip title="Renovar">
                  <IconButton
                    aria-label={`Renovar documento de ${row.staffCode}`}
                    onClick={() => {
                      setError('');
                      setDates({ issueDate: '', expiryDate: '' });
                      setRenewing(row);
                    }}
                  >
                    <RefreshCw size={17} />
                  </IconButton>
                </Tooltip>
              </TableCell>
            )}
          </TableRow>
        )}
      />

      <Dialog open={Boolean(renewing)} onClose={() => !saving && setRenewing(null)} fullWidth maxWidth="xs">
        <form onSubmit={submitRenewal}>
          <DialogTitle>Renovar — {renewing?.staffCode}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
            <DateField
              required
              fullWidth
              size="small"
              label="Data de emissão"
              value={dates.issueDate}
              onChange={(event) => setDates((current) => ({ ...current, issueDate: event.target.value }))}
              sx={{ mt: 1 }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <DateField
              required
              fullWidth
              size="small"
              label="Data de validade"
              value={dates.expiryDate}
              onChange={(event) => setDates((current) => ({ ...current, expiryDate: event.target.value }))}
              sx={{ mt: 1.5 }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRenewing(null)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'A guardar…' : 'Renovar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </section>
  );
}
