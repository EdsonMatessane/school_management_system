import { useEffect, useMemo, useState } from 'react';
import { Alert, Autocomplete, Button, CircularProgress, TextField } from '@mui/material';
import { Pencil, Plus, X } from 'lucide-react';
import {
  createStudentExam,
  getCourses,
  getDisciplines,
  getModules,
  updateStudentExam,
} from '../../../services/api';

const unitTypeOptions = [
  { id: 'MODULE', name: 'Módulo' },
  { id: 'DISCIPLINE', name: 'Disciplina' },
];

const initialForm = {
  course: null,
  category: null,
  level: null,
  modality: null,
  unitType: null,
  unit: null,
  name: '',
  maxGrade: '20',
};

const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível guardar o exame.';

const uniqueCourseOptions = (courses, idKey, nameKey) => (
  [...new Map(courses.map((course) => [
    course[idKey],
    { id: course[idKey], name: course[nameKey] },
  ])).values()]
);

const parseMaxGrade = (value) => {
  const normalized = String(value).trim().replace(',', '.');
  if (!/^\d{1,2}([.]\d{1,2})?$/.test(normalized)) return null;
  const number = Number(normalized);
  return number > 0 && number <= 20 ? number : null;
};

export default function StudentExamCreatePage({ exam, onCancel, onSaved }) {
  const [form, setForm] = useState(initialForm);
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([getCourses(), getModules(), getDisciplines()])
      .then(([loadedCourses, loadedModules, loadedDisciplines]) => {
        if (!mounted) return;
        setCourses(loadedCourses.filter((course) => (
          course.active || course.id === exam?.courseId
        )));
        setModules(loadedModules);
        setDisciplines(loadedDisciplines);
        if (exam) {
          const course = loadedCourses.find((item) => item.id === exam.courseId) ?? null;
          const isModule = exam.unitType === 'MODULE';
          setForm({
            course,
            category: course ? { id: course.categoryId, name: course.categoryName } : null,
            level: course ? { id: course.levelId, name: course.levelName } : null,
            modality: course ? { id: course.modalityId, name: course.modalityName } : null,
            unitType: unitTypeOptions.find((option) => option.id === exam.unitType) ?? null,
            unit: {
              id: exam.unitId,
              number: exam.unitNumber,
              name: exam.unitName,
              typeName: isModule ? 'Módulo' : 'Disciplina',
            },
            name: exam.name,
            maxGrade: String(exam.maxGrade),
          });
        }
      })
      .catch((loadError) => {
        if (mounted) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [exam]);

  const categoryOptions = useMemo(
    () => uniqueCourseOptions(courses, 'categoryId', 'categoryName'),
    [courses],
  );
  const levelOptions = useMemo(
    () => uniqueCourseOptions(
      courses.filter((course) => !form.category || course.categoryId === form.category.id),
      'levelId',
      'levelName',
    ),
    [courses, form.category],
  );
  const modalityOptions = useMemo(
    () => uniqueCourseOptions(
      courses.filter((course) => (
        (!form.category || course.categoryId === form.category.id)
        && (!form.level || course.levelId === form.level.id)
      )),
      'modalityId',
      'modalityName',
    ),
    [courses, form.category, form.level],
  );
  const filteredCourses = useMemo(
    () => courses.filter((course) => (
      (!form.category || course.categoryId === form.category.id)
      && (!form.level || course.levelId === form.level.id)
      && (!form.modality || course.modalityId === form.modality.id)
    )),
    [courses, form.category, form.level, form.modality],
  );
  const unitOptions = useMemo(() => {
    if (!form.course || !form.unitType) return [];
    const isModule = form.unitType.id === 'MODULE';
    return (isModule ? modules : disciplines)
      .filter((item) => item.courseId === form.course.id && item.active)
      .map((item) => ({
        id: item.id,
        number: isModule ? item.moduleNumber : item.disciplineNumber,
        name: item.name,
        typeName: form.unitType.name,
      }));
  }, [disciplines, form.course, form.unitType, modules]);

  const setField = (field, value) => {
    setForm((current) => {
      const updated = { ...current, [field]: value };
      if (field === 'category') {
        updated.level = null;
        updated.modality = null;
        updated.course = null;
        updated.unit = null;
      }
      if (field === 'level') {
        updated.modality = null;
        updated.course = null;
        updated.unit = null;
      }
      if (field === 'modality') {
        updated.course = null;
        updated.unit = null;
      }
      if (field === 'course') {
        updated.unit = null;
        updated.category = value
          ? { id: value.categoryId, name: value.categoryName }
          : current.category;
        updated.level = value
          ? { id: value.levelId, name: value.levelName }
          : current.level;
        updated.modality = value
          ? { id: value.modalityId, name: value.modalityName }
          : current.modality;
      }
      if (field === 'unitType') updated.unit = null;
      return updated;
    });
    setError('');
  };

  const maxGradeError = form.maxGrade.trim() && parseMaxGrade(form.maxGrade) === null
    ? 'A nota máxima deve ser maior que 0 e não superior a 20.'
    : '';

  const submit = async (event) => {
    event.preventDefault();
    const maxGrade = parseMaxGrade(form.maxGrade);
    if (!form.course) {
      setError('Selecione um curso.');
      return;
    }
    if (!form.unitType || !form.unit) {
      setError('Selecione um módulo ou uma disciplina.');
      return;
    }
    if (!form.name.trim()) {
      setError('Indique o nome do exame.');
      return;
    }
    if (maxGrade === null) {
      setError('A nota máxima deve ser maior que 0 e não superior a 20.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const request = {
        courseId: form.course.id,
        moduleId: form.unitType.id === 'MODULE' ? form.unit.id : null,
        disciplineId: form.unitType.id === 'DISCIPLINE' ? form.unit.id : null,
        name: form.name,
        maxGrade,
      };
      const result = exam
        ? await updateStudentExam(exam.id, request)
        : await createStudentExam(request);
      onSaved(result, Boolean(exam));
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const renderAutocomplete = (label, value, options, getOptionLabel, onChange, extra = {}) => (
    <Autocomplete
      options={options}
      value={value}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      onChange={(_, selected) => onChange(selected)}
      disabled={extra.disabled ?? false}
      noOptionsText={extra.noOptionsText ?? 'Nenhuma opção disponível.'}
      renderInput={(params) => (
        <TextField {...params} required label={label} size="small" />
      )}
    />
  );

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>{exam ? 'Editar exame' : 'Criar'}</h1>
        </div>
        {exam && (
          <Button startIcon={<X size={17} />} onClick={onCancel}>
            Cancelar edição
          </Button>
        )}
      </header>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <CircularProgress size={24} aria-label="A carregar dados do exame" />
      ) : (
        <form className="cacoin-student-form-card" onSubmit={submit}>
          <div className="cacoin-course-form-grid">
            {renderAutocomplete(
              'Curso',
              form.course,
              filteredCourses,
              (course) => course.name,
              (course) => setField('course', course),
              {
                disabled: Boolean(exam),
                noOptionsText: 'Não existem cursos compatíveis com as opções selecionadas.',
              },
            )}
            {renderAutocomplete(
              'Categoria',
              form.category,
              categoryOptions,
              (option) => option.name,
              (option) => setField('category', option),
              { disabled: Boolean(exam) },
            )}
            {renderAutocomplete(
              'Nível',
              form.level,
              levelOptions,
              (option) => option.name,
              (option) => setField('level', option),
              { disabled: Boolean(exam) || !form.category },
            )}
            {renderAutocomplete(
              'Modalidade',
              form.modality,
              modalityOptions,
              (option) => option.name,
              (option) => setField('modality', option),
              { disabled: Boolean(exam) || !form.level },
            )}
            {renderAutocomplete(
              'Unidade Curricular',
              form.unitType,
              unitTypeOptions,
              (option) => option.name,
              (option) => setField('unitType', option),
              { disabled: Boolean(exam) },
            )}
            {renderAutocomplete(
              form.unitType?.name ?? 'Módulo ou Disciplina',
              form.unit,
              unitOptions,
              (unit) => `${unit.typeName} ${unit.number} — ${unit.name}`,
              (unit) => setField('unit', unit),
              {
                disabled: Boolean(exam) || !form.course || !form.unitType,
                noOptionsText: 'Este curso não tem opções ativas.',
              },
            )}
            <TextField
              required
              fullWidth
              size="small"
              label="Nome do Exame"
              value={form.name}
              onChange={(event) => setField('name', event.target.value)}
            />
            <TextField
              required
              fullWidth
              size="small"
              label="Nota Máxima"
              value={form.maxGrade}
              onChange={(event) => setField(
                'maxGrade',
                event.target.value.replace(/[^\d.,]/g, '').slice(0, 5),
              )}
              error={Boolean(maxGradeError)}
              helperText={maxGradeError || undefined}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
          </div>

          <div className="cacoin-student-form-actions">
            <Button
              type="submit"
              variant="contained"
              sx={{ marginLeft: 'auto' }}
              startIcon={saving
                ? <CircularProgress size={16} color="inherit" />
                : exam ? <Pencil size={17} /> : <Plus size={17} />}
              disabled={saving}
            >
              {saving
                ? exam ? 'A guardar alterações…' : 'A criar…'
                : exam ? 'Guardar alterações' : 'Criar exame'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
