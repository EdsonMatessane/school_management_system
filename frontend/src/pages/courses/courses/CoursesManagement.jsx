import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
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
import StandardTable from '../../../components/StandardTable';
import DataExportMenu from '../../../components/DataExportMenu';
import SearchField from '../../../components/SearchField';
import { filterBySearch } from '../../../utils/search';
import { formatMoney } from '../../../utils/money';
import {
  createCourse,
  deleteCourse,
  getCategories,
  getCourses,
  getEnrollmentFees,
  getLevels,
  getManualFees,
  getModalities,
  getMonthlyFees,
  setCourseActive,
  updateCourse,
} from '../../../services/api';

const emptyForm = {
  name: '',
  durationMonths: '',
  category: null,
  noLevel: false,
  level: null,
  modality: null,
  monthlyFee: null,
  enrollmentFee: null,
  manualFee: null,
};

// Nível reservado criado pelo sistema para os cursos sem nível (ver LevelService.NO_LEVEL_NAME).
const isNoLevelName = (name) => (
  name?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase() === 'SEM NIVEL'
);

const formatFee = (amount, type) => `${formatMoney(amount)} - ${type}`;
const formatDuration = (months) => {
  if (!months) return '—';
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years > 0) {
    const yearLabel = `${years} ${years === 1 ? 'ano' : 'anos'}`;
    if (remainingMonths === 0) return yearLabel;
    const monthLabel = `${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
    return `${yearLabel} e ${monthLabel}`;
  }
  return `${months} ${months === 1 ? 'mês' : 'meses'}`;
};
const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';

const columns = [
  { key: 'name', label: 'Curso' },
  { key: 'category', label: 'Categoria' },
  { key: 'level', label: 'Nível' },
  { key: 'modality', label: 'Modalidade' },
  { key: 'duration', label: 'Duração' },
  { key: 'monthlyFee', label: 'Mensalidade' },
  { key: 'enrollmentFee', label: 'Valor de inscrição' },
  { key: 'manualFee', label: 'Valor de manual' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: 'Ações', align: 'right' },
];
const exportColumns = columns.filter(({ key }) => key !== 'actions');

export default function CoursesManagement() {
  const [courses, setCourses] = useState([]);
  const [options, setOptions] = useState({
    categories: [],
    levels: [],
    modalities: [],
    monthlyFees: [],
    enrollmentFees: [],
    manualFees: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deletingCourse, setDeletingCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCourses = useMemo(() => {
    return filterBySearch(courses, searchTerm, (course) => [
        course.name,
        formatDuration(course.durationMonths),
        course.categoryName,
        course.levelName,
        course.modalityName,
        course.monthlyFeeType,
        course.enrollmentFeeType,
        course.manualFeeType,
        course.monthlyFeeAmount,
        course.enrollmentFeeAmount,
        course.manualFeeAmount,
        formatMoney(course.monthlyFeeAmount),
        formatMoney(course.enrollmentFeeAmount),
        formatMoney(course.manualFeeAmount),
        course.active ? 'Ativo' : 'Inativo',
      ]);
  }, [courses, searchTerm]);
  const exportRows = filteredCourses.map((course) => ({
    name: course.name,
    category: course.categoryName,
    level: course.levelName,
    modality: course.modalityName,
    duration: formatDuration(course.durationMonths),
    monthlyFee: formatFee(course.monthlyFeeAmount, course.monthlyFeeType),
    enrollmentFee: formatFee(course.enrollmentFeeAmount, course.enrollmentFeeType),
    manualFee: formatFee(course.manualFeeAmount, course.manualFeeType),
    status: course.active ? 'Ativo' : 'Inativo',
  }));

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [
        loadedCourses,
        loadedCategories,
        loadedLevels,
        loadedModalities,
        loadedMonthlyFees,
        loadedEnrollmentFees,
        loadedManualFees,
      ] = await Promise.all([
        getCourses(),
        getCategories(),
        getLevels(),
        getModalities(),
        getMonthlyFees(),
        getEnrollmentFees(),
        getManualFees(),
      ]);
      setCourses(loadedCourses);
      setOptions({
        categories: loadedCategories.filter((item) => item.active),
        levels: loadedLevels.filter((item) => item.active && !isNoLevelName(item.name)),
        modalities: loadedModalities.filter((item) => item.active),
        monthlyFees: loadedMonthlyFees.filter((item) => item.active),
        enrollmentFees: loadedEnrollmentFees.filter((item) => item.active),
        manualFees: loadedManualFees.filter((item) => item.active),
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateDialog = () => {
    setEditingCourse(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  };

  const openEditDialog = (course) => {
    const noLevel = isNoLevelName(course.levelName);
    setEditingCourse(course);
    setForm({
      name: course.name,
      durationMonths: course.durationMonths ?? '',
      category: options.categories.find((item) => item.id === course.categoryId) ?? null,
      noLevel,
      level: noLevel ? null : options.levels.find((item) => item.id === course.levelId) ?? null,
      modality: options.modalities.find((item) => item.id === course.modalityId) ?? null,
      monthlyFee: options.monthlyFees.find((item) => item.id === course.monthlyFeeId) ?? null,
      enrollmentFee: options.enrollmentFees.find((item) => item.id === course.enrollmentFeeId) ?? null,
      manualFee: options.manualFees.find((item) => item.id === course.manualFeeId) ?? null,
    });
    setError('');
    setDialogOpen(true);
  };

  const submitCourse = async (event) => {
    event.preventDefault();
    const durationMonths = Number(form.durationMonths);
    if (!Number.isSafeInteger(durationMonths) || durationMonths <= 0) {
      setError('Indique a duração do curso em meses, com um número inteiro maior que zero.');
      return;
    }
    const requiredFields = [
      'category',
      ...(form.noLevel ? [] : ['level']),
      'modality',
      'monthlyFee',
      'enrollmentFee',
      'manualFee',
    ];
    if (requiredFields.some((field) => !form[field])) {
      setError('Preencha todos os autocompletes do curso.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      name: form.name,
      durationMonths,
      categoryId: form.category.id,
      levelId: form.noLevel ? null : form.level.id,
      noLevel: form.noLevel,
      modalityId: form.modality.id,
      monthlyFeeId: form.monthlyFee.id,
      enrollmentFeeId: form.enrollmentFee.id,
      manualFeeId: form.manualFee.id,
    };
    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, payload);
        setNotice('O curso foi atualizado.');
      } else {
        await createCourse(payload);
        setNotice('O curso foi criado.');
      }
      setDialogOpen(false);
      await loadData();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const toggleCourse = async (course) => {
    setError('');
    setNotice('');
    try {
      await setCourseActive(course.id, !course.active);
      setNotice(course.active ? 'O curso foi desativado.' : 'O curso foi ativado.');
      await loadData();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    setError('');
    try {
      await deleteCourse(deletingCourse.id);
      setNotice('O curso foi apagado.');
      setDeletingCourse(null);
      await loadData();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const renderOptionAutocomplete = (field, label, items, getOptionLabel, disabled = false) => (
    <Autocomplete
      options={items}
      value={form[field]}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      onChange={(_, value) => setField(field, value)}
      disabled={disabled}
      noOptionsText={`Não existem opções ativas para ${label.toLocaleLowerCase('pt-MZ')}.`}
      renderInput={(params) => (
        <TextField {...params} required={!disabled} label={label} size="small" />
      )}
    />
  );

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Gestão de Cursos</p>
          <h1>Cursos</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename="cursos"
            title="Lista de Cursos"
            disabled={loading}
            onError={(exportError) => setError(exportError.message)}
          />
          <Button variant="contained" startIcon={<Plus size={17} />} onClick={openCreateDialog}>
            Novo curso
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
        audit="Course"
        ariaLabel="Lista de cursos"
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar os cursos.'
          : searchTerm.trim()
            ? 'Nenhum curso corresponde à pesquisa.'
            : 'Ainda não existem cursos.'}
        loading={loading}
        rows={filteredCourses}
        renderRow={(course, rowNumber) => (
          <TableRow key={course.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>
              <span className="cacoin-level-name">
                <BookOpen size={18} aria-hidden="true" />
                {course.name}
              </span>
            </TableCell>
            <TableCell>{course.categoryName}</TableCell>
            <TableCell>{course.levelName}</TableCell>
            <TableCell>{course.modalityName}</TableCell>
            <TableCell>{formatDuration(course.durationMonths)}</TableCell>
            <TableCell>{formatFee(course.monthlyFeeAmount, course.monthlyFeeType)}</TableCell>
            <TableCell>{formatFee(course.enrollmentFeeAmount, course.enrollmentFeeType)}</TableCell>
            <TableCell>{formatFee(course.manualFeeAmount, course.manualFeeType)}</TableCell>
            <TableCell>
              <Chip
                size="small"
                color={course.active ? 'success' : 'default'}
                label={course.active ? 'Ativo' : 'Inativo'}
              />
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Editar curso">
                <IconButton
                  className="cacoin-table-action-edit"
                  aria-label={`Editar ${course.name}`}
                  onClick={() => openEditDialog(course)}
                >
                  <Pencil size={17} />
                </IconButton>
              </Tooltip>
              <Tooltip title={course.active ? 'Desativar curso' : 'Ativar curso'}>
                <IconButton
                  className={course.active
                    ? 'cacoin-table-action-deactivate'
                    : 'cacoin-table-action-activate'}
                  aria-label={`${course.active ? 'Desativar' : 'Ativar'} ${course.name}`}
                  onClick={() => toggleCourse(course)}
                >
                  <Power size={17} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Apagar curso">
                <IconButton
                  className="cacoin-table-action-delete"
                  aria-label={`Apagar ${course.name}`}
                  onClick={() => setDeletingCourse(course)}
                >
                  <Trash2 size={17} />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="md">
        <form onSubmit={submitCourse}>
          <DialogTitle>{editingCourse ? 'Editar curso' : 'Novo curso'}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mt: 1, mb: 1 }}>{error}</Alert>}
            <div className="cacoin-course-form-grid">
              <Autocomplete
                freeSolo
                options={courses.map((course) => course.name)}
                value={form.name}
                onChange={(_, value) => setField('name', value ?? '')}
                onInputChange={(_, value, reason) => {
                  if (reason === 'input') setField('name', value);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="Nome do curso"
                    size="small"
                  />
                )}
              />
              {renderOptionAutocomplete(
                'category',
                'Categoria',
                options.categories,
                (item) => item.name,
              )}
              <FormControl sx={{ gridColumn: '1 / -1' }}>
                <FormLabel id="course-level-mode-label">Nível do curso</FormLabel>
                <RadioGroup
                  row
                  aria-labelledby="course-level-mode-label"
                  value={form.noLevel ? 'none' : 'level'}
                  onChange={(event) => {
                    const noLevel = event.target.value === 'none';
                    setForm((current) => ({
                      ...current,
                      noLevel,
                      level: noLevel ? null : current.level,
                    }));
                  }}
                >
                  <FormControlLabel value="level" control={<Radio size="small" />} label="Com nível" />
                  <FormControlLabel value="none" control={<Radio size="small" />} label="Sem nível" />
                </RadioGroup>
              </FormControl>
              {renderOptionAutocomplete(
                'level',
                'Nível',
                options.levels,
                (item) => item.name,
                form.noLevel,
              )}
              {renderOptionAutocomplete(
                'modality',
                'Modalidade',
                options.modalities,
                (item) => item.name,
              )}
              <TextField
                required
                label="Duração (meses)"
                type="number"
                size="small"
                value={form.durationMonths}
                onChange={(event) => setField('durationMonths', event.target.value)}
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
              />
              {renderOptionAutocomplete(
                'monthlyFee',
                'Mensalidade',
                options.monthlyFees,
                (item) => `${item.type} - ${formatMoney(item.amount)}`,
              )}
              {renderOptionAutocomplete(
                'enrollmentFee',
                'Valor de inscrição',
                options.enrollmentFees,
                (item) => `${item.type} - ${formatMoney(item.amount)}`,
              )}
              {renderOptionAutocomplete(
                'manualFee',
                'Valor de manual',
                options.manualFees,
                (item) => `${item.type} - ${formatMoney(item.amount)}`,
              )}
            </div>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {editingCourse ? 'Guardar alterações' : 'Criar curso'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(deletingCourse)}
        onClose={() => !saving && setDeletingCourse(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Apagar curso</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mt: 1, mb: 1 }}>{error}</Alert>}
          Tem a certeza de que pretende apagar o curso “{deletingCourse?.name}”?
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeletingCourse(null)} disabled={saving}>Cancelar</Button>
          <Button onClick={confirmDelete} disabled={saving}>Apagar</Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
