import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Power, Tags, Trash2 } from 'lucide-react';
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
  createCategory,
  deleteCategory,
  getCategories,
  setCategoryActive,
  updateCategory,
} from '../../../services/api';

const emptyForm = { name: '', description: '' };

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';
}

export default function CategoriesManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const filteredCategories = useMemo(
    () => filterBySearch(categories, searchTerm, (category) => [
      category.name, category.description, category.active ? 'Ativo' : 'Inativo',
    ]),
    [categories, searchTerm],
  );
  const columns = [
    { key: 'name', label: 'Categoria' },
    { key: 'description', label: 'Descrição' },
    { key: 'status', label: 'Estado' },
    { key: 'actions', label: 'Ações', align: 'right' },
  ];
  const exportColumns = [
    { key: 'name', label: 'Categoria' },
    { key: 'description', label: 'Descrição' },
    { key: 'status', label: 'Estado' },
  ];
  const exportRows = filteredCategories.map((category) => ({
    name: category.name,
    description: category.description || '—',
    status: category.active ? 'Ativo' : 'Inativo',
  }));

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCategories(await getCategories());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const openCreateDialog = () => {
    setEditingCategory(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  };

  const openEditDialog = (category) => {
    setEditingCategory(category);
    setForm({ name: category.name, description: category.description ?? '' });
    setError('');
    setDialogOpen(true);
  };

  const submitCategory = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, form);
        setNotice('A categoria foi atualizada.');
      } else {
        await createCategory(form);
        setNotice('A categoria foi criada.');
      }
      setDialogOpen(false);
      await loadCategories();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = async (category) => {
    setError('');
    setNotice('');
    try {
      await setCategoryActive(category.id, !category.active);
      setNotice(category.active ? 'A categoria foi desativada.' : 'A categoria foi ativada.');
      await loadCategories();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    setError('');
    try {
      await deleteCategory(deletingCategory.id);
      setNotice('A categoria foi apagada.');
      setDeletingCategory(null);
      await loadCategories();
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
          <h1>Categorias</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename="categorias"
            title="Lista de Categorias"
            disabled={loading}
            onError={(exportError) => setError(exportError.message)}
          />
          <Button variant="contained" startIcon={<Plus size={17} />} onClick={openCreateDialog}>
            Nova categoria
          </Button>
        </div>
      </header>

      {error && !dialogOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>
      )}

      <StandardTable
        audit="Category"
        ariaLabel="Lista de categorias"
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar as categorias.'
          : searchTerm.trim()
            ? 'Nenhuma categoria corresponde à pesquisa.'
            : 'Ainda não existem categorias.'}
        loading={loading}
        rows={filteredCategories}
        renderRow={(category, rowNumber) => (
          <TableRow key={category.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>
              <span className="cacoin-level-name">
                <Tags size={18} aria-hidden="true" />
                {category.name}
              </span>
            </TableCell>
            <TableCell>{category.description || '—'}</TableCell>
            <TableCell>
              <Chip
                size="small"
                color={category.active ? 'success' : 'default'}
                label={category.active ? 'Ativo' : 'Inativo'}
              />
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Editar categoria">
                <IconButton
                  className="cacoin-table-action-edit"
                  aria-label={`Editar ${category.name}`}
                  onClick={() => openEditDialog(category)}
                >
                  <Pencil size={17} />
                </IconButton>
              </Tooltip>
              <Tooltip title={category.active ? 'Desativar categoria' : 'Ativar categoria'}>
                <IconButton
                  className={category.active
                    ? 'cacoin-table-action-deactivate'
                    : 'cacoin-table-action-activate'}
                  aria-label={`${category.active ? 'Desativar' : 'Ativar'} ${category.name}`}
                  onClick={() => toggleCategory(category)}
                >
                  <Power size={17} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Apagar categoria">
                <IconButton
                  className="cacoin-table-action-delete"
                  aria-label={`Apagar ${category.name}`}
                  onClick={() => setDeletingCategory(category)}
                >
                  <Trash2 size={17} />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={submitCategory}>
          <DialogTitle>{editingCategory ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
            <TextField
              autoFocus
              required
              fullWidth
              size="small"
              margin="dense"
              label="Nome da categoria"
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
            <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {editingCategory ? 'Guardar alterações' : 'Criar categoria'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deletingCategory)}
        onClose={() => !saving && setDeletingCategory(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Apagar categoria</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mt: 1, mb: 1 }}>{error}</Alert>}
          Tem a certeza de que pretende apagar a categoria “{deletingCategory?.name}”?
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeletingCategory(null)} disabled={saving}>Cancelar</Button>
          <Button onClick={confirmDelete} disabled={saving}>Apagar</Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
