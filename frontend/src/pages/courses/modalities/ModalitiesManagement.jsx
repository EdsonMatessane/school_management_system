import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import StandardTable from '../../../components/StandardTable';
import DataExportMenu from '../../../components/DataExportMenu';
import SearchField from '../../../components/SearchField';
import { filterBySearch } from '../../../utils/search';
import {
  createModality,
  deleteModality,
  getModalities,
  setModalityActive,
  updateModality,
} from '../../../services/api';

const emptyForm = { name: '', description: '' };

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';
}

export default function ModalitiesManagement() {
  const [modalities, setModalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModality, setEditingModality] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deletingModality, setDeletingModality] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const filteredModalities = useMemo(
    () => filterBySearch(modalities, searchTerm, (modality) => [
      modality.name, modality.description, modality.active ? 'Ativo' : 'Inativo',
    ]),
    [modalities, searchTerm],
  );
  const columns = [
    { key: 'name', label: 'Modalidade' },
    { key: 'description', label: 'Descrição' },
    { key: 'status', label: 'Estado' },
    { key: 'actions', label: 'Ações', align: 'right' },
  ];
  const exportColumns = [
    { key: 'name', label: 'Modalidade' },
    { key: 'description', label: 'Descrição' },
    { key: 'status', label: 'Estado' },
  ];
  const exportRows = filteredModalities.map((modality) => ({
    name: modality.name,
    description: modality.description || '—',
    status: modality.active ? 'Ativo' : 'Inativo',
  }));

  const loadModalities = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setModalities(await getModalities());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModalities();
  }, [loadModalities]);

  const openCreateDialog = () => {
    setEditingModality(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  };

  const openEditDialog = (modality) => {
    setEditingModality(modality);
    setForm({ name: modality.name, description: modality.description ?? '' });
    setError('');
    setDialogOpen(true);
  };

  const submitModality = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingModality) {
        await updateModality(editingModality.id, form);
        setNotice('A modalidade foi atualizada.');
      } else {
        await createModality(form);
        setNotice('A modalidade foi criada.');
      }
      setDialogOpen(false);
      await loadModalities();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const toggleModality = async (modality) => {
    setError('');
    setNotice('');
    try {
      await setModalityActive(modality.id, !modality.active);
      setNotice(modality.active
        ? 'A modalidade foi desativada.'
        : 'A modalidade foi ativada.');
      await loadModalities();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    setError('');
    try {
      await deleteModality(deletingModality.id);
      setNotice('A modalidade foi apagada.');
      setDeletingModality(null);
      await loadModalities();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Gestão de Cursos</p>
          <h1>Modalidades</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename="modalidades"
            title="Lista de Modalidades"
            disabled={loading}
            onError={(exportError) => setError(exportError.message)}
          />
          <Button
            variant="contained"
            startIcon={<Plus size={17} />}
            onClick={openCreateDialog}
            sx={{ textTransform: 'none' }}
          >
            Nova modalidade
          </Button>
        </div>
      </header>

      {error && !dialogOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      <StandardTable
        audit="Modality"
        ariaLabel="Lista de modalidades"
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar as modalidades.'
          : searchTerm.trim()
            ? 'Nenhuma modalidade corresponde à pesquisa.'
            : 'Ainda não existem modalidades.'}
        loading={loading}
        rows={filteredModalities}
        renderRow={(modality, rowNumber) => (
          <TableRow key={modality.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>
              <span className="cacoin-level-name">
                <Layers size={18} aria-hidden="true" />
                {modality.name}
              </span>
            </TableCell>
            <TableCell>{modality.description || '—'}</TableCell>
            <TableCell>
              <Chip
                size="small"
                color={modality.active ? 'success' : 'default'}
                label={modality.active ? 'Ativo' : 'Inativo'}
              />
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Editar modalidade">
                <IconButton
                  className="cacoin-table-action-edit"
                  aria-label={`Editar ${modality.name}`}
                  onClick={() => openEditDialog(modality)}
                >
                  <Pencil size={17} />
                </IconButton>
              </Tooltip>
              <Tooltip title={modality.active ? 'Desativar modalidade' : 'Ativar modalidade'}>
                <IconButton
                  className={modality.active
                    ? 'cacoin-table-action-deactivate'
                    : 'cacoin-table-action-activate'}
                  aria-label={`${modality.active ? 'Desativar' : 'Ativar'} ${modality.name}`}
                  onClick={() => toggleModality(modality)}
                >
                  <Power size={17} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Apagar modalidade">
                <IconButton
                  className="cacoin-table-action-delete"
                  aria-label={`Apagar ${modality.name}`}
                  onClick={() => setDeletingModality(modality)}
                >
                  <Trash2 size={17} />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={submitModality}>
          <DialogTitle>{editingModality ? 'Editar modalidade' : 'Nova modalidade'}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
            <TextField
              autoFocus
              required
              fullWidth
              size="small"
              margin="dense"
              label="Nome da modalidade"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))}
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            <TextField
              fullWidth
              multiline
              minRows={3}
              size="small"
              margin="dense"
              label="Descrição"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              sx={{ textTransform: 'none' }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{ textTransform: 'none' }}
            >
              {editingModality ? 'Guardar alterações' : 'Criar modalidade'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deletingModality)}
        onClose={() => !saving && setDeletingModality(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Apagar modalidade</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mt: 1, mb: 1 }}>{error}</Alert>}
          Tem a certeza de que pretende apagar a modalidade “{deletingModality?.name}”?
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeletingModality(null)}
            disabled={saving}
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmDelete}
            disabled={saving}
            sx={{ textTransform: 'none' }}
          >
            Apagar
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
