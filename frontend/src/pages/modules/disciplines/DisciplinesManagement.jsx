import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Eye, Pencil, Plus, Power, Trash2 } from 'lucide-react';
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
import SearchField from '../../../components/SearchField';
import DataExportMenu from '../../../components/DataExportMenu';
import StandardTable from '../../../components/StandardTable';
import {
  createDiscipline,
  deleteDiscipline,
  getCourseDisciplines,
  getCourses,
  getDisciplines,
  setDisciplineActive,
  updateDiscipline,
} from '../../../services/api';
import { filterBySearch } from '../../../utils/search';

const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';

export default function DisciplinesManagement() {
  const [disciplines, setDisciplines] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseDisciplines, setCourseDisciplines] = useState([]);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingDiscipline, setEditingDiscipline] = useState(null);
  const [deletingDiscipline, setDeletingDiscipline] = useState(null);
  const [form, setForm] = useState({ course: null, name: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [loadedDisciplines, loadedCourses] = await Promise.all([
        getDisciplines(),
        getCourses(),
      ]);
      setDisciplines(loadedDisciplines);
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
    disciplines: disciplines.filter((discipline) => discipline.courseId === course.id),
  })).filter(({ disciplines: courseDisciplines }) => courseDisciplines.length > 0), [courses, disciplines]);

  const filteredGroups = useMemo(
    () => filterBySearch(courseGroups, searchTerm, ({ course, disciplines: items }) => [
      course.name,
      items.length,
      ...items.flatMap((discipline) => [
        discipline.disciplineNumber,
        discipline.name,
        discipline.active ? 'Ativo' : 'Inativo',
      ]),
    ]),
    [courseGroups, searchTerm],
  );

  const openList = async (course) => {
    setSelectedCourse(course);
    setListDialogOpen(true);
    setListLoading(true);
    setError('');
    try {
      setCourseDisciplines(await getCourseDisciplines(course.id));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setListLoading(false);
    }
  };

  const refreshCourseList = async (courseId) => {
    const [loadedDisciplines, loadedCourses, loadedCourseDisciplines] = await Promise.all([
      getDisciplines(),
      getCourses(),
      courseId ? getCourseDisciplines(courseId) : Promise.resolve([]),
    ]);
    setDisciplines(loadedDisciplines);
    setCourses(loadedCourses);
    setCourseDisciplines(loadedCourseDisciplines);
  };

  const openCreateForm = (course = null) => {
    setEditingDiscipline(null);
    setForm({ course, name: '' });
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (discipline) => {
    setEditingDiscipline(discipline);
    setForm({
      course: courses.find((course) => course.id === discipline.courseId) ?? null,
      name: discipline.name,
    });
    setFormError('');
    setFormOpen(true);
  };

  const submitDiscipline = async (event) => {
    event.preventDefault();
    if (!form.course) {
      setFormError('Selecione um curso.');
      return;
    }
    if (!form.name.trim()) {
      setFormError('Indique o nome da disciplina.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = { courseId: form.course.id, name: form.name };
      if (editingDiscipline) {
        await updateDiscipline(editingDiscipline.id, payload);
        setNotice('A disciplina foi atualizada.');
      } else {
        await createDiscipline(payload);
        setNotice('A disciplina foi criada.');
      }
      setFormOpen(false);
      await refreshCourseList(selectedCourse?.id);
    } catch (saveError) {
      setFormError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const toggleDiscipline = async (discipline) => {
    setError('');
    setNotice('');
    try {
      await setDisciplineActive(discipline.id, !discipline.active);
      setNotice(discipline.active
        ? `A Disciplina ${discipline.disciplineNumber} foi desativada.`
        : `A Disciplina ${discipline.disciplineNumber} foi ativada.`);
      await refreshCourseList(selectedCourse?.id);
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    setError('');
    try {
      await deleteDiscipline(deletingDiscipline.id);
      setNotice('A disciplina foi apagada.');
      setDeletingDiscipline(null);
      await refreshCourseList(selectedCourse?.id);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'course', label: 'Curso' },
    { key: 'count', label: 'N.º total de disciplinas', align: 'center' },
    { key: 'actions', label: 'Ações', align: 'right' },
  ];
  const disciplineColumns = [
    { key: 'number', label: 'Disciplina' },
    { key: 'name', label: 'Nome' },
    { key: 'status', label: 'Estado' },
    { key: 'actions', label: 'Ações', align: 'right' },
  ];
  const exportColumns = [
    { key: 'course', label: 'Curso' },
    { key: 'number', label: 'Disciplina' },
    { key: 'name', label: 'Nome' },
    { key: 'status', label: 'Estado' },
  ];
  const exportRows = filteredGroups.flatMap(({ course, disciplines: items }) => (
    filterBySearch(items, searchTerm, (discipline) => [
      course.name,
      discipline.disciplineNumber,
      discipline.name,
      discipline.active ? 'Ativo' : 'Inativo',
    ]).map((discipline) => ({
      course: course.name,
      number: `Disciplina ${discipline.disciplineNumber}`,
      name: discipline.name,
      status: discipline.active ? 'Ativo' : 'Inativo',
    }))
  ));

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Gestão de Módulos</p>
          <h1>Disciplinas</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename="disciplinas"
            title="Lista de Disciplinas"
            disabled={loading}
            onError={(exportError) => setError(exportError.message)}
          />
          <Button variant="contained" startIcon={<Plus size={17} />} onClick={() => openCreateForm()}>
            Nova disciplina
          </Button>
        </div>
      </header>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>
      )}

      <StandardTable
        audit="Course"
        ariaLabel="Total de disciplinas por curso"
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar os cursos e disciplinas.'
          : searchTerm.trim()
            ? 'Nenhum curso corresponde à pesquisa.'
            : 'Ainda não existem disciplinas.'}
        loading={loading}
        rows={filteredGroups}
        renderRow={({ course, disciplines: items }, rowNumber) => (
          <TableRow key={course.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>
              <span className="cacoin-level-name">
                <BookOpen size={18} aria-hidden="true" />
                {course.name}
              </span>
            </TableCell>
            <TableCell align="center">{items.length}</TableCell>
            <TableCell align="right">
              <Tooltip title="Ver disciplinas">
                <IconButton
                  aria-label={`Ver disciplinas do curso ${course.name}`}
                  onClick={() => openList(course)}
                >
                  <Eye size={17} />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog
        open={listDialogOpen}
        onClose={() => setListDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Disciplinas — {selectedCourse?.name}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <StandardTable
            audit="Discipline"
            ariaLabel={`Disciplinas do curso ${selectedCourse?.name ?? ''}`}
            columns={disciplineColumns}
            emptyMessage={listLoading
              ? 'A carregar disciplinas…'
              : 'Este curso ainda não tem disciplinas.'}
            loading={listLoading}
            rows={courseDisciplines}
            renderRow={(discipline, rowNumber) => (
              <TableRow key={discipline.id} hover>
                <TableCell>{rowNumber}</TableCell>
                <TableCell>Disciplina {discipline.disciplineNumber}</TableCell>
                <TableCell>{discipline.name}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={discipline.active ? 'success' : 'default'}
                    label={discipline.active ? 'Ativo' : 'Inativo'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar disciplina">
                    <IconButton
                      className="cacoin-table-action-edit"
                      aria-label={`Editar disciplina ${discipline.disciplineNumber}`}
                      onClick={() => openEditForm(discipline)}
                    >
                      <Pencil size={17} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={discipline.active ? 'Desativar disciplina' : 'Ativar disciplina'}>
                    <IconButton
                      className={discipline.active
                        ? 'cacoin-table-action-deactivate'
                        : 'cacoin-table-action-activate'}
                      aria-label={`${discipline.active ? 'Desativar' : 'Ativar'} disciplina ${discipline.disciplineNumber}`}
                      onClick={() => toggleDiscipline(discipline)}
                    >
                      <Power size={17} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Apagar disciplina">
                    <IconButton
                      className="cacoin-table-action-delete"
                      aria-label={`Apagar disciplina ${discipline.disciplineNumber}`}
                      onClick={() => setDeletingDiscipline(discipline)}
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
          <Button onClick={() => setListDialogOpen(false)}>Fechar</Button>
          <Button
            variant="contained"
            startIcon={<Plus size={17} />}
            onClick={() => openCreateForm(selectedCourse)}
            disabled={!selectedCourse}
          >
            Nova disciplina
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={formOpen} onClose={() => !saving && setFormOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={submitDiscipline}>
          <DialogTitle>{editingDiscipline ? 'Editar disciplina' : 'Nova disciplina'}</DialogTitle>
          <DialogContent>
            {formError && <Alert severity="error" sx={{ mt: 1, mb: 2 }}>{formError}</Alert>}
            <div className="cacoin-course-form-grid">
              <Autocomplete
                options={courses}
                value={form.course}
                getOptionLabel={(course) => course.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, course) => setForm((current) => ({ ...current, course }))}
                disabled={Boolean(editingDiscipline)}
                noOptionsText="Ainda não existem cursos."
                renderInput={(params) => (
                  <TextField {...params} required label="Curso" size="small" />
                )}
              />
              {editingDiscipline && (
                <TextField
                  label="Número da disciplina"
                  size="small"
                  value={`Disciplina ${editingDiscipline.disciplineNumber}`}
                  disabled
                />
              )}
              <TextField
                required
                fullWidth
                size="small"
                label="Nome da disciplina"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {editingDiscipline ? 'Guardar alterações' : 'Criar disciplina'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deletingDiscipline)}
        onClose={() => !saving && setDeletingDiscipline(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Apagar disciplina</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mt: 1, mb: 1 }}>{error}</Alert>}
          Tem a certeza de que pretende apagar a Disciplina {deletingDiscipline?.disciplineNumber}
          {' '}— {deletingDiscipline?.name}?
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeletingDiscipline(null)} disabled={saving}>Cancelar</Button>
          <Button onClick={confirmDelete} disabled={saving}>Apagar</Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
