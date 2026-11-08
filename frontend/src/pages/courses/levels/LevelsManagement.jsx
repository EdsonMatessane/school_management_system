import { useCallback, useEffect, useMemo, useState } from 'react';
import { GraduationCap, Pencil, Plus, Power, Trash2 } from 'lucide-react';
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
  createLevel,
  deleteLevel,
  getLevels,
  setLevelActive,
  updateLevel,
} from '../../../services/api';

const emptyForm = { name: '', description: '' };

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';
}

export default function LevelsManagement() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deletingLevel, setDeletingLevel] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const filteredLevels = useMemo(
    () => filterBySearch(levels, searchTerm, (level) => [
      level.name, level.description, level.active ? 'Ativo' : 'Inativo',
    ]),
    [levels, searchTerm],
  );
  const columns = [
    { key: 'name', label: 'Nível' },
    { key: 'description', label: 'Descrição' },
    { key: 'status', label: 'Estado' },
    { key: 'actions', label: 'Ações', align: 'right' },
  ];
  const exportColumns = [
    { key: 'name', label: 'Nível' },
    { key: 'description', label: 'Descrição' },
    { key: 'status', label: 'Estado' },
  ];
  const exportRows = filteredLevels.map((level) => ({
    name: level.name,
    description: level.description || '—',
    status: level.active ? 'Ativo' : 'Inativo',
  }));

  const loadLevels = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setLevels(await getLevels());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLevels();
  }, [loadLevels]);

  const openCreateDialog = () => {
    setEditingLevel(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  };

  const openEditDialog = (level) => {
    setEditingLevel(level);
    setForm({ name: level.name, description: level.description ?? '' });
    setError('');
    setDialogOpen(true);
  };

  const submitLevel = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingLevel) {
        await updateLevel(editingLevel.id, form);
        setNotice('O nível foi atualizado.');
      } else {
        await createLevel(form);
        setNotice('O nível foi criado.');
      }
      setDialogOpen(false);
      await loadLevels();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const toggleLevel = async (level) => {
    setError('');
    setNotice('');
    try {
      await setLevelActive(level.id, !level.active);
      setNotice(level.active ? 'O nível foi desativado.' : 'O nível foi ativado.');
      await loadLevels();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    setError('');
    try {
      await deleteLevel(deletingLevel.id);
      setNotice('O nível foi apagado.');
      setDeletingLevel(null);
      await loadLevels();
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
          <h1>Níveis</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename="niveis"
            title="Lista de Níveis"
            disabled={loading}
            onError={(exportError) => setError(exportError.message)}
          />
          <Button
            variant="contained"
            startIcon={<Plus size={17} />}
            onClick={openCreateDialog}
            sx={{ textTransform: 'none' }}
          >
            Novo nível
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
        audit="Level"
        ariaLabel="Lista de níveis"
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar os níveis.'
          : searchTerm.trim()
            ? 'Nenhum nível corresponde à pesquisa.'
            : 'Ainda não existem níveis.'}
        loading={loading}
        rows={filteredLevels}
        renderRow={(level, rowNumber) => (
          <TableRow key={level.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>
              <span className="cacoin-level-name">
                <GraduationCap size={18} aria-hidden="true" />
                {level.name}
              </span>
            </TableCell>
            <TableCell>{level.description || '—'}</TableCell>
            <TableCell>
              <Chip
                size="small"
                color={level.active ? 'success' : 'default'}
                label={level.active ? 'Ativo' : 'Inativo'}
              />
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Editar nível">
                <IconButton
                  className="cacoin-table-action-edit"
                  aria-label={`Editar ${level.name}`}
                  onClick={() => openEditDialog(level)}
                >
                  <Pencil size={17} />
                </IconButton>
              </Tooltip>
              <Tooltip title={level.active ? 'Desativar nível' : 'Ativar nível'}>
                <IconButton
                  className={level.active
                    ? 'cacoin-table-action-deactivate'
                    : 'cacoin-table-action-activate'}
                  aria-label={`${level.active ? 'Desativar' : 'Ativar'} ${level.name}`}
                  onClick={() => toggleLevel(level)}
                >
                  <Power size={17} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Apagar nível">
                <IconButton
                  className="cacoin-table-action-delete"
                  aria-label={`Apagar ${level.name}`}
                  onClick={() => setDeletingLevel(level)}
                >
                  <Trash2 size={17} />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={submitLevel}>
          <DialogTitle>{editingLevel ? 'Editar nível' : 'Novo nível'}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
            <TextField
              autoFocus
              required
              fullWidth
              size="small"
              margin="dense"
              label="Nome do nível"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
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
            <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ textTransform: 'none' }}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={saving} sx={{ textTransform: 'none' }}>
              {editingLevel ? 'Guardar alterações' : 'Criar nível'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deletingLevel)}
        onClose={() => !saving && setDeletingLevel(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Apagar nível</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mt: 1, mb: 1 }}>{error}</Alert>}
          Tem a certeza de que pretende apagar o nível “{deletingLevel?.name}”?
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeletingLevel(null)} disabled={saving} sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={saving} sx={{ textTransform: 'none' }}>
            Apagar
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
