import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  Radio,
  RadioGroup,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import StandardTable from '../../../components/StandardTable';
import {
  createStaffDocumentType,
  deleteStaffDocumentType,
  getStaffDocumentTypes,
  updateStaffDocumentType,
} from '../../../services/api';
import { errorMessage } from './staffDocumentUtils';

const validityOptions = (
  <>
    <FormControlLabel value="yes" control={<Radio size="small" />} label="Com validade" />
    <FormControlLabel value="no" control={<Radio size="small" />} label="Sem validade" />
  </>
);

export default function StaffDocumentTypesPage() {
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({ name: '', validity: 'no' });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTypes(await getStaffDocumentTypes());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action, message, onDone) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(message);
      onDone?.();
      await load();
    } catch (actionError) {
      setError(errorMessage(actionError));
    } finally {
      setSaving(false);
    }
  };

  const create = (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Indique o nome do tipo de documento.');
      return;
    }
    run(
      () => createStaffDocumentType({ name: form.name.trim(), hasValidity: form.validity === 'yes' }),
      'Tipo de documento registado.',
      () => setForm({ name: '', validity: 'no' }),
    );
  };

  const saveEdit = (event) => {
    event.preventDefault();
    run(
      () => updateStaffDocumentType(editing.id, {
        name: editing.name.trim(),
        hasValidity: editing.validity === 'yes',
      }),
      'Tipo de documento guardado.',
      () => setEditing(null),
    );
  };

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Funcionários</p>
          <h1>Documentos</h1>
        </div>
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <section className="cacoin-settings-card">
        <form onSubmit={create}>
          <div className="cacoin-settings-section-heading">
            <Plus size={20} />
            <div>
              <h2>Registar novo tipo</h2>
            </div>
          </div>
          <div className="cacoin-settings-grid">
            <TextField
              required
              fullWidth
              size="small"
              label="Nome"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            <FormControl>
              <FormLabel>Validade</FormLabel>
              <RadioGroup
                row
                value={form.validity}
                onChange={(event) => setForm((current) => ({ ...current, validity: event.target.value }))}
              >
                {validityOptions}
              </RadioGroup>
            </FormControl>
          </div>
          <div className="cacoin-settings-actions">
            <Button type="submit" variant="contained" disabled={saving || loading}>
              Registar tipo
            </Button>
          </div>
        </form>
      </section>
      <StandardTable
        audit="StaffDocumentType"
        ariaLabel="Tipos de documento"
        columns={[
          { key: 'name', label: 'Tipo de documento' },
          { key: 'validity', label: 'Validade' },
          { key: 'actions', label: 'Acções', align: 'right' },
        ]}
        emptyMessage="Ainda não existem tipos de documento."
        loading={loading}
        rows={types}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{row.requiresDescription ? `${row.name} (especificar)` : row.name}</TableCell>
            <TableCell>
              {row.hasValidity ? 'Data de emissão e data de validade' : 'Sem validade'}
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Editar">
                <span>
                  <IconButton
                    className="cacoin-table-action-edit"
                    aria-label={`Editar ${row.name}`}
                    disabled={saving || row.requiresDescription}
                    onClick={() => setEditing({
                      id: row.id,
                      name: row.name,
                      system: row.system,
                      validity: row.hasValidity ? 'yes' : 'no',
                    })}
                  >
                    <Pencil size={17} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={row.system ? 'Tipo de base' : 'Apagar'}>
                <span>
                  <IconButton
                    className="cacoin-table-action-delete"
                    aria-label={`Apagar ${row.name}`}
                    disabled={saving || row.system}
                    onClick={() => setDeleting(row)}
                  >
                    <Trash2 size={17} />
                  </IconButton>
                </span>
              </Tooltip>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog open={Boolean(editing)} onClose={() => !saving && setEditing(null)} fullWidth maxWidth="xs">
        <form onSubmit={saveEdit}>
          <DialogTitle>Editar tipo de documento</DialogTitle>
          <DialogContent>
            <TextField
              required
              fullWidth
              size="small"
              label="Nome"
              value={editing?.name ?? ''}
              disabled={editing?.system}
              onChange={(event) => setEditing((current) => ({ ...current, name: event.target.value }))}
              sx={{ mt: 1 }}
            />
            <FormControl sx={{ mt: 2 }}>
              <FormLabel>Validade</FormLabel>
              <RadioGroup
                row
                value={editing?.validity ?? 'no'}
                onChange={(event) => setEditing((current) => ({ ...current, validity: event.target.value }))}
              >
                {validityOptions}
              </RadioGroup>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(null)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>Guardar</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={Boolean(deleting)} onClose={() => !saving && setDeleting(null)} fullWidth maxWidth="xs">
        <DialogTitle>Apagar tipo de documento</DialogTitle>
        <DialogContent>Apagar o tipo {deleting?.name}?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)} disabled={saving}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={saving}
            onClick={() => run(
              () => deleteStaffDocumentType(deleting.id),
              'Tipo de documento apagado.',
              () => setDeleting(null),
            )}
          >
            Apagar
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
