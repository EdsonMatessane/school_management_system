import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Eye,
  Pencil,
  Plus,
  Power,
  Trash2,
} from 'lucide-react';
import {
  Alert,
  Autocomplete,
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
import { RichTextEditor, RichTextViewer } from '../../../components/RichTextEditor';
import DataExportMenu from '../../../components/DataExportMenu';
import SearchField from '../../../components/SearchField';
import StandardTable from '../../../components/StandardTable';
import {
  createModule,
  deleteModule,
  getCourses,
  getModule,
  getModules,
  setModuleActive,
  updateModule,
} from '../../../services/api';
import { filterBySearch } from '../../../utils/search';

const emptyDocument = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });

const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';

export default function ModulesManagement() {
  const [modules, setModules] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsModule, setDetailsModule] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [deletingModule, setDeletingModule] = useState(null);
  const [form, setForm] = useState({ course: null, name: '', details: emptyDocument });
  const [editorInstance, setEditorInstance] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [loadedModules, loadedCourses] = await Promise.all([getModules(), getCourses()]);
      setModules(loadedModules);
      setCourses(loadedCourses);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const courseGroups = useMemo(() => courses.map((course) => ({
    course,
    modules: modules.filter((module) => module.courseId === course.id),
  })).filter(({ modules: courseModules }) => courseModules.length > 0), [courses, modules]);

  const filteredGroups = useMemo(
    () => filterBySearch(courseGroups, searchTerm, ({ course, modules: courseModules }) => [
      course.name,
      courseModules.length,
      ...courseModules.flatMap((module) => [
        module.moduleNumber,
        module.name,
        module.active ? 'Ativo' : 'Inativo',
      ]),
    ]),
    [courseGroups, searchTerm],
  );

  const openCreateForm = (course = null) => {
    setEditorInstance((instance) => instance + 1);
    setEditingModule(null);
    setForm({ course, name: '', details: emptyDocument });
    setError('');
    setFormOpen(true);
  };

  const openEditForm = async (module) => {
    setLoadingEdit(true);
    setError('');
    try {
      const fullModule = await getModule(module.id);
      setEditorInstance((instance) => instance + 1);
      setEditingModule(fullModule);
      setForm({
        course: courses.find((course) => course.id === fullModule.courseId) ?? null,
        name: fullModule.name,
        details: fullModule.details,
      });
      setFormOpen(true);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoadingEdit(false);
    }
  };

  const openDetails = async (module) => {
    setDetailsOpen(true);
    setDetailsModule(null);
    setDetailsTarget(module);
    setDetailsError('');
    setDetailsLoading(true);
    try {
      setDetailsModule(await getModule(module.id));
    } catch (loadError) {
      setDetailsError(getErrorMessage(loadError));
    } finally {
      setDetailsLoading(false);
    }
  };

  const submitModule = async (event) => {
    event.preventDefault();
    if (!form.course) {
      setError('Selecione um curso.');
      return;
    }
    if (!form.name.trim()) {
      setError('Indique o nome do módulo.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      courseId: form.course.id,
      name: form.name,
      details: form.details,
    };
    try {
      if (editingModule) {
        await updateModule(editingModule.id, payload);
        setNotice('O módulo foi atualizado.');
      } else {
        await createModule(payload);
        setNotice('O módulo foi criado.');
      }
      setFormOpen(false);
      await loadData();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = async (module) => {
    setError('');
    setNotice('');
    try {
      await setModuleActive(module.id, !module.active);
      setNotice(module.active ? 'O módulo foi desativado.' : 'O módulo foi ativado.');
      await loadData();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    setError('');
    try {
      await deleteModule(deletingModule.id);
      setNotice('O módulo foi apagado.');
      setDeletingModule(null);
      await loadData();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'course', label: 'Curso' },
    { key: 'count', label: 'N.º total de módulos', align: 'center' },
    { key: 'actions', label: 'Ações', align: 'right' },
  ];
  const moduleColumns = [
    { key: 'number', label: 'Módulo' },
    { key: 'name', label: 'Nome' },
    { key: 'status', label: 'Estado' },
    { key: 'actions', label: 'Ações', align: 'right' },
  ];
  const exportColumns = [
    { key: 'course', label: 'Curso' },
    { key: 'number', label: 'Módulo' },
    { key: 'name', label: 'Nome' },
    { key: 'status', label: 'Estado' },
  ];
  const exportRows = filteredGroups.flatMap(({ course, modules: courseModules }) => (
    filterBySearch(courseModules, searchTerm, (module) => [
      course.name,
      module.moduleNumber,
      module.name,
      module.active ? 'Ativo' : 'Inativo',
    ]).map((module) => ({
      course: course.name,
      number: `Módulo ${module.moduleNumber}`,
      name: module.name,
      status: module.active ? 'Ativo' : 'Inativo',
    }))
  ));

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Gestão de Módulos</p>
          <h1>Módulos</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename="modulos"
            title="Lista de Módulos"
            disabled={loading}
            onError={(exportError) => setError(exportError.message)}
          />
          <Button variant="contained" startIcon={<Plus size={17} />} onClick={() => openCreateForm()}>
            Novo módulo
          </Button>
        </div>
      </header>

      {error && !formOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>
      )}

      <StandardTable
        audit="Course"
        ariaLabel="Total de módulos por curso"
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar os cursos e módulos.'
          : searchTerm.trim()
            ? 'Nenhum curso corresponde à pesquisa.'
            : 'Ainda não existem módulos.'}
        loading={loading}
        rows={filteredGroups}
        renderRow={({ course, modules: courseModules }, rowNumber) => (
          <TableRow key={course.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>
              <span className="cacoin-level-name">
                <BookOpen size={18} aria-hidden="true" />
                {course.name}
              </span>
            </TableCell>
            <TableCell align="center">{courseModules.length}</TableCell>
            <TableCell align="right">
              <Tooltip title="Ver módulos">
                <IconButton
                  aria-label={`Ver módulos do curso ${course.name}`}
                  onClick={() => {
                    setSelectedCourse(course);
                    setModuleDialogOpen(true);
                  }}
                >
                  <Eye size={17} />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog
        open={moduleDialogOpen}
        onClose={() => setModuleDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Módulos — {selectedCourse?.name}</DialogTitle>
        <DialogContent>
          <StandardTable
            audit="Module"
            ariaLabel={`Módulos do curso ${selectedCourse?.name ?? ''}`}
            columns={moduleColumns}
            emptyMessage="Este curso ainda não tem módulos."
            rows={modules.filter((module) => module.courseId === selectedCourse?.id)}
            renderRow={(module, rowNumber) => (
              <TableRow key={module.id} hover>
                <TableCell>{rowNumber}</TableCell>
                <TableCell>Módulo {module.moduleNumber}</TableCell>
                <TableCell>{module.name}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={module.active ? 'success' : 'default'}
                    label={module.active ? 'Ativo' : 'Inativo'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Ver detalhes do módulo">
                    <IconButton
                      aria-label={`Ver detalhes do módulo ${module.moduleNumber}`}
                      onClick={() => openDetails(module)}
                    >
                      <Eye size={17} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar módulo">
                    <IconButton
                      className="cacoin-table-action-edit"
                      aria-label={`Editar módulo ${module.moduleNumber}`}
                      onClick={() => openEditForm(module)}
                      disabled={loadingEdit}
                    >
                      <Pencil size={17} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={module.active ? 'Desativar módulo' : 'Ativar módulo'}>
                    <IconButton
                      className={module.active
                        ? 'cacoin-table-action-deactivate'
                        : 'cacoin-table-action-activate'}
                      aria-label={`${module.active ? 'Desativar' : 'Ativar'} módulo ${module.moduleNumber}`}
                      onClick={() => toggleModule(module)}
                    >
                      <Power size={17} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Apagar módulo">
                    <IconButton
                      className="cacoin-table-action-delete"
                      aria-label={`Apagar módulo ${module.moduleNumber}`}
                      onClick={() => setDeletingModule(module)}
                    >
                      <Trash2 size={17} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setModuleDialogOpen(false)}>Fechar</Button>
          <Button
            variant="contained"
            startIcon={<Plus size={17} />}
            onClick={() => openCreateForm(selectedCourse)}
            disabled={!selectedCourse}
          >
            Novo módulo
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <form onSubmit={submitModule}>
          <DialogTitle>{editingModule ? 'Editar módulo' : 'Novo módulo'}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mt: 1, mb: 2 }}>{error}</Alert>}
            <div className="cacoin-course-form-grid">
              <Autocomplete
                options={courses}
                value={form.course}
                getOptionLabel={(course) => course.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, course) => setForm((current) => ({ ...current, course }))}
                disabled={Boolean(editingModule)}
                noOptionsText="Ainda não existem cursos."
                renderInput={(params) => (
                  <TextField {...params} required label="Curso" size="small" />
                )}
              />
              {editingModule && (
                <TextField
                  label="Número do módulo"
                  size="small"
                  value={`Módulo ${editingModule.moduleNumber}`}
                  disabled
                />
              )}
              <TextField
                required
                fullWidth
                size="small"
                label="Nome do módulo"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))}
              />
              <div className="cacoin-rich-text-field">
                <p className="cacoin-rich-text-label">Detalhes do módulo</p>
                <RichTextEditor
                  key={editorInstance}
                  value={form.details}
                  onChange={(details) => setForm((current) => ({ ...current, details }))}
                />
              </div>
            </div>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {editingModule ? 'Guardar alterações' : 'Criar módulo'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {detailsModule
            ? `Módulo ${detailsModule.moduleNumber}: ${detailsModule.name}`
            : detailsTarget
              ? `Módulo ${detailsTarget.moduleNumber}: ${detailsTarget.name}`
              : 'Detalhes do módulo'}
        </DialogTitle>
        <DialogContent>
          {detailsError && <Alert severity="error" sx={{ mb: 2 }}>{detailsError}</Alert>}
          {detailsLoading && <p>A carregar detalhes…</p>}
          <p className="cacoin-eyebrow">{detailsModule?.courseName}</p>
          {detailsModule && <RichTextViewer value={detailsModule.details} />}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDetailsOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deletingModule)}
        onClose={() => !saving && setDeletingModule(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Apagar módulo</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mt: 1, mb: 1 }}>{error}</Alert>}
          Tem a certeza de que pretende apagar o Módulo {deletingModule?.moduleNumber}
          {' '}— {deletingModule?.name}?
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeletingModule(null)} disabled={saving}>Cancelar</Button>
          <Button onClick={confirmDelete} disabled={saving}>Apagar</Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
