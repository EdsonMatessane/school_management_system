import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  IconButton,
  Stack,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { Plus, Trash2 } from 'lucide-react';
import StandardTable from '../../../components/StandardTable';
import {
  createStaffDocument,
  deleteStaffDocument,
  getStaffDocumentTypes,
  getStaffDocuments,
} from '../../../services/api';
import { toDisplayDate } from '../../../utils/date';
import { documentLabel, errorMessage } from './staffDocumentUtils';
import DateField from '../../../components/DateField';

const emptyForm = { type: null, description: '', issueDate: '', expiryDate: '' };

export default function StaffDocumentsPanel({ staffId, pending, onPendingChange }) {
  const [types, setTypes] = useState([]);
  const [saved, setSaved] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedTypes, loadedDocuments] = await Promise.all([
        getStaffDocumentTypes(),
        staffId ? getStaffDocuments(staffId) : Promise.resolve([]),
      ]);
      setTypes(loadedTypes);
      setSaved(loadedDocuments);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    load();
  }, [load]);

  const type = form.type;
  const rows = staffId
    ? saved
    : pending.map((item, index) => ({
      id: `pending-${index}`,
      index,
      typeName: item.typeName,
      description: item.description,
      issueDate: item.issueDate,
      expiryDate: item.expiryDate,
    }));

  const add = async () => {
    if (!type) {
      setError('Selecione o tipo de documento.');
      return;
    }
    if (type.requiresDescription && !form.description.trim()) {
      setError('Especifique o documento.');
      return;
    }
    if (type.hasValidity && (!form.issueDate || !form.expiryDate || form.expiryDate <= form.issueDate)) {
      setError('Indique a data de emissão e uma data de validade posterior.');
      return;
    }
    const payload = {
      typeId: type.id,
      description: type.requiresDescription ? form.description.trim() : null,
      issueDate: type.hasValidity ? form.issueDate : null,
      expiryDate: type.hasValidity ? form.expiryDate : null,
    };
    setError('');
    if (!staffId) {
      onPendingChange([...pending, { ...payload, typeName: type.name }]);
      setForm(emptyForm);
      return;
    }
    setSaving(true);
    try {
      await createStaffDocument(staffId, payload);
      setForm(emptyForm);
      await load();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    setError('');
    if (!staffId) {
      onPendingChange(pending.filter((_, index) => index !== row.index));
      return;
    }
    setSaving(true);
    try {
      await deleteStaffDocument(row.id);
      await load();
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={1.5} sx={{ mt: 3 }}>
      <h3>Documentos</h3>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      <div className="cacoin-test-registration-form">
        <Autocomplete
          options={types}
          value={type}
          onChange={(_, value) => setForm({ ...emptyForm, type: value })}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField {...params} label="Tipo de Documento" size="small" />
          )}
        />
        {type?.requiresDescription && (
          <TextField
            size="small"
            label="Especificar"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
        )}
        {type?.hasValidity && (
          <>
            <DateField
              size="small"
              label="Data de emissão"
              value={form.issueDate}
              onChange={(event) => setForm((current) => ({ ...current, issueDate: event.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <DateField
              size="small"
              label="Data de validade"
              value={form.expiryDate}
              onChange={(event) => setForm((current) => ({ ...current, expiryDate: event.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </>
        )}
        <div className="cacoin-test-registration-actions">
          <Button
            variant="outlined"
            startIcon={<Plus size={17} />}
            onClick={add}
            disabled={saving || loading}
          >
            Adicionar documento
          </Button>
        </div>
      </div>
      <StandardTable
        audit="StaffDocument"
        ariaLabel="Documentos do funcionário"
        columns={[
          { key: 'type', label: 'Documento' },
          { key: 'issueDate', label: 'Data de emissão' },
          { key: 'expiryDate', label: 'Data de validade' },
          { key: 'actions', label: 'Acções', align: 'right' },
        ]}
        emptyMessage="Ainda não existem documentos."
        loading={loading}
        rows={rows}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{documentLabel(row)}</TableCell>
            <TableCell>{row.issueDate ? toDisplayDate(row.issueDate) : '—'}</TableCell>
            <TableCell>{row.expiryDate ? toDisplayDate(row.expiryDate) : '—'}</TableCell>
            <TableCell align="right">
              <Tooltip title="Apagar">
                <span>
                  <IconButton
                    className="cacoin-table-action-delete"
                    aria-label={`Apagar documento ${row.typeName}`}
                    disabled={saving}
                    onClick={() => remove(row)}
                  >
                    <Trash2 size={17} />
                  </IconButton>
                </span>
              </Tooltip>
            </TableCell>
          </TableRow>
        )}
      />
    </Stack>
  );
}
