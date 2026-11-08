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
import { RefreshCw } from 'lucide-react';
import DataExportMenu from '../../components/DataExportMenu';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import StatusBadge from '../../components/StatusBadge';
import { getStaffDocuments, getTeacherProfile, renewStaffDocument } from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { filterBySearch } from '../../utils/search';
import { dayLabel, documentLabel, errorMessage } from '../staff/documents/staffDocumentUtils';
import { todayIso } from '../staffattendances/staffAttendanceUtils';
import DateField from '../../components/DateField';

const columns = [
  { key: 'document', label: 'Documento' },
  { key: 'issueDate', label: 'Data de Emissão' },
  { key: 'expiryDate', label: 'Data de Validade' },
  { key: 'days', label: 'Dias' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: 'Acções', align: 'right' },
];

/** Estado de um documento: expirado, válido ou sem validade. */
const describe = (document, today) => {
  if (!document.hasValidity || !document.expiryDate) {
    return { label: 'Sem validade', tone: 'neutral', days: null };
  }
  const diff = Math.round((new Date(document.expiryDate) - new Date(today)) / 86400000);
  return diff < 0
    ? { label: 'Expirado', tone: 'rejected', days: diff }
    : { label: 'Válido', tone: 'paid', days: diff };
};

export default function TeacherDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [renewing, setRenewing] = useState(null);
  const [dates, setDates] = useState({ issueDate: '', expiryDate: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const today = todayIso();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { staff } = await getTeacherProfile();
      setDocuments(await getStaffDocuments(staff.id));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => filterBySearch(
    documents.map((document) => ({ ...document, ...describe(document, today) })),
    searchTerm,
    (document) => [documentLabel(document), document.label],
  ), [documents, searchTerm, today]);
  const exportColumns = columns.filter(({ key }) => key !== 'actions');
  const exportRows = rows.map((row) => ({
    document: documentLabel(row),
    issueDate: row.issueDate ? toDisplayDate(row.issueDate) : '—',
    expiryDate: row.expiryDate ? toDisplayDate(row.expiryDate) : '—',
    days: row.days == null ? '—' : dayLabel(row.days),
    status: row.label,
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
      await renewStaffDocument(renewing.id, dates);
      setNotice('Documento renovado.');
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
          <p className="cacoin-eyebrow">Meu Perfil</p>
          <h1>Expirados</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename="meus-documentos"
            title="Meus documentos"
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
        ariaLabel="Meus documentos"
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar os dados.'
          : 'Não tem documentos registados.'}
        loading={loading}
        rows={rows}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{documentLabel(row)}</TableCell>
            <TableCell>{row.issueDate ? toDisplayDate(row.issueDate) : '—'}</TableCell>
            <TableCell>{row.expiryDate ? toDisplayDate(row.expiryDate) : '—'}</TableCell>
            <TableCell>{row.days == null ? '—' : dayLabel(row.days)}</TableCell>
            <TableCell><StatusBadge label={row.label} tone={row.tone} /></TableCell>
            <TableCell align="right">
              {row.hasValidity && (
                <Tooltip title="Renovar">
                  <IconButton
                    aria-label={`Renovar ${documentLabel(row)}`}
                    onClick={() => {
                      setError('');
                      setDates({ issueDate: '', expiryDate: '' });
                      setRenewing(row);
                    }}
                  >
                    <RefreshCw size={17} />
                  </IconButton>
                </Tooltip>
              )}
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog open={Boolean(renewing)} onClose={() => !saving && setRenewing(null)} fullWidth maxWidth="xs">
        <form onSubmit={submitRenewal}>
          <DialogTitle>Renovar — {renewing && documentLabel(renewing)}</DialogTitle>
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
