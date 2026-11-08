import { isTeacherMode } from '../../utils/teacherMode';
import { relatedCourseOptions } from '../../utils/courseFilters';
import { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  MenuItem,
  TextField,
} from '@mui/material';
import RichTextField from '../../components/RichTextField';
import {
  api,
  getCourses,
  getModules,
  getOnlineClassPlatforms,
  getStaff,
} from '../../services/api';
import { DateTimeField } from '../../components/DateField';
import './online-classes.css';

const emptyForm = {
  title: '',
  description: '',
  course: null,
  module: null,
  teacher: null,
  startAt: '',
  endAt: '',
  platform: '',
  meetingUrl: '',
  meetingPassword: '',
  recurrence: 'NONE',
  categoryId: '',
  levelId: '',
  modalityId: '',
};

const platforms = [
  { value: 'GOOGLE_MEET', label: 'Google Meet' },
  { value: 'ZOOM', label: 'Zoom' },
  { value: 'TEAMS', label: 'Microsoft Teams' },
  { value: 'OTHER', label: 'Outro' },
];

const recurrences = [
  { value: 'NONE', label: 'Aula única' },
  { value: 'DAILY', label: 'Diária' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensal' },
];

const getErrorMessage = (error) =>
  error.response?.data?.message ||
  error.message ||
  'Não foi possível concluir a operação.';

const formatTeacherName = (teacher) =>
  [teacher?.firstName, teacher?.surname].filter(Boolean).join(' ') ||
  teacher?.name ||
  teacher?.staffCode ||
  '';

export default function OnlineClassesRegistrationPage({
  lesson,
  onCancel,
  onSaved,
}) {
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [platformSettings, setPlatformSettings] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getCourses(),
      getModules(),
      getStaff('teachers'),
      getOnlineClassPlatforms(),
    ])
      .then(([loadedCourses, loadedModules, loadedTeachers, loadedPlatforms]) => {
        if (!mounted) return;
        setCourses(loadedCourses.filter((course) => course.active));
        setModules(loadedModules.filter((module) => module.active));
        setTeachers(loadedTeachers.filter((teacher) => teacher.active));
        setPlatformSettings(loadedPlatforms);
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
  }, []);

  const configuredPlatforms = platformSettings
    .filter((setting) => setting.url?.trim())
    .map((setting) => platforms.find(({ value }) => value === setting.platform))
    .filter(Boolean);

  const platformOptions =
    configuredPlatforms;

  useEffect(() => {
    if (!lesson) {
      setForm({
        ...emptyForm,
        platform: configuredPlatforms[0]?.value || '',
      });
      return;
    }
    const platform = configuredPlatforms.some(
      ({ value }) => value === lesson.platform,
    )
      ? lesson.platform
      : configuredPlatforms[0]?.value || '';
    setForm({
      ...emptyForm,
      ...lesson,
      platform,
      course: courses.find((course) => course.id === lesson.courseId) || null,
      module: modules.find((module) => module.id === lesson.moduleId) || null,
      teacher:
        teachers.find((teacher) => teacher.id === lesson.teacherId) || null,
      startAt: lesson.startAt ? lesson.startAt.slice(0, 16) : '',
      endAt: lesson.endAt ? lesson.endAt.slice(0, 16) : '',
      categoryId: String(
        courses.find((course) => course.id === lesson.courseId)?.categoryId ??
          '',
      ),
      levelId: String(
        courses.find((course) => course.id === lesson.courseId)?.levelId ?? '',
      ),
      modalityId: String(
        courses.find((course) => course.id === lesson.courseId)?.modalityId ??
          '',
      ),
    });
  }, [courses, lesson, modules, platformSettings, teachers]);

  const selectedCourse = form.course;
  const relatedOptions = relatedCourseOptions(courses, selectedCourse);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  // Mudar categoria, nível ou modalidade passa para o curso do mesmo nome que corresponde.
  const changeDetail = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      const match = current.course && courses.find((course) => (
        course.name === current.course.name
        && String(course.categoryId) === next.categoryId
        && String(course.levelId) === next.levelId
        && String(course.modalityId) === next.modalityId
      ));
      return match && match.id !== current.course.id
        ? { ...next, course: match, module: null }
        : next;
    });
  };
  const submitLesson = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      title: form.title.trim(),
      description: form.description,
      courseId: form.course?.id ?? null,
      moduleId: form.module?.id ?? null,
      teacherId: form.teacher?.id ?? null,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      platform: form.platform,
      meetingUrl: form.meetingUrl.trim(),
      meetingPassword: form.meetingPassword.trim(),
      recurrence: form.recurrence,
    };
    try {
      if (lesson) {
        await api.put(`/online-classes/${lesson.id}`, payload);
      } else {
        await api.post('/online-classes', payload);
      }
      onSaved();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="cacoin-course-page cacoin-tasks-page online-classes-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Aulas Online</p>
          <h1>{lesson ? 'Editar aula' : 'Registar aula'}</h1>
        </div>
      </header>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <form
        className="online-classes-registration-form cacoin-student-form-card"
        onSubmit={submitLesson}
      >
        <div className="cacoin-course-form-grid online-classes-dialog-grid">
          <TextField
            required
            label="Título"
            size="small"
            value={form.title}
            disabled={loading}
            onChange={(event) => setField('title', event.target.value)}
            slotProps={{ htmlInput: { maxLength: 180 } }}
          />
          <Autocomplete
            options={courses}
            value={form.course}
            disabled={loading}
            getOptionLabel={(option) => option?.name || ''}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(_, course) =>
              setForm((current) => ({
                ...current,
                course,
                module: null,
                categoryId: course ? String(course.categoryId) : '',
                levelId: course ? String(course.levelId) : '',
                modalityId: course ? String(course.modalityId) : '',
              }))
            }
            noOptionsText="Sem cursos disponíveis"
            renderInput={(params) => (
              <TextField {...params} required label="Curso" size="small" />
            )}
          />
          <TextField
            select
            required
            label="Categoria"
            size="small"
            value={form.categoryId}
            disabled={loading || !selectedCourse}
            onChange={(event) => changeDetail('categoryId', event.target.value)}
          >
            <MenuItem value="">Selecionar categoria</MenuItem>
            {relatedOptions.categories.map((category) => (
              <MenuItem key={category.id} value={String(category.id)}>
                {category.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            required
            label="Nível"
            size="small"
            value={form.levelId}
            disabled={loading || !selectedCourse}
            onChange={(event) => changeDetail('levelId', event.target.value)}
          >
            <MenuItem value="">Selecionar nível</MenuItem>
            {relatedOptions.levels.map((level) => (
              <MenuItem key={level.id} value={String(level.id)}>
                {level.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            required
            label="Modalidade"
            size="small"
            value={form.modalityId}
            disabled={loading || !selectedCourse}
            onChange={(event) => changeDetail('modalityId', event.target.value)}
          >
            <MenuItem value="">Selecionar modalidade</MenuItem>
            {relatedOptions.modalities.map((modality) => (
              <MenuItem key={modality.id} value={String(modality.id)}>
                {modality.name}
              </MenuItem>
            ))}
          </TextField>
          <Autocomplete
            options={modules.filter(
              (module) => module.courseId === form.course?.id,
            )}
            value={form.module}
            disabled={loading || !form.course}
            getOptionLabel={(option) => option?.name || ''}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(_, module) => setField('module', module)}
            noOptionsText="Sem módulos disponíveis"
            renderInput={(params) => (
              <TextField {...params} label="Módulo" size="small" />
            )}
          />
          {!isTeacherMode() && (
            <Autocomplete
              options={teachers}
              value={form.teacher}
              disabled={loading}
              getOptionLabel={formatTeacherName}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, teacher) => setField('teacher', teacher)}
              noOptionsText="Sem professores disponíveis"
              renderInput={(params) => (
                <TextField {...params} label="Professor" size="small" />
              )}
            />
          )}
          <DateTimeField
            required
            label="Data e hora de início"
            size="small"
            value={form.startAt}
            disabled={loading}
            onChange={(event) => setField('startAt', event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <DateTimeField
            required
            label="Data e hora de fim"
            size="small"
            value={form.endAt}
            disabled={loading}
            onChange={(event) => setField('endAt', event.target.value)}
            slotProps={{
              htmlInput: { min: form.startAt || undefined },
              inputLabel: { shrink: true },
            }}
          />
          <TextField
            select
            required
            label="Plataforma"
            size="small"
            value={form.platform}
            disabled={loading || platformOptions.length === 0}
            onChange={(event) => setField('platform', event.target.value)}
          >
            {platformOptions.length === 0 && (
              <MenuItem value="" disabled>
                Sem plataformas configuradas
              </MenuItem>
            )}
            {platformOptions.map((platform) => (
              <MenuItem key={platform.value} value={platform.value}>
                {platform.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            required
            type="url"
            label="Link da aula"
            size="small"
            value={form.meetingUrl}
            disabled={loading}
            onChange={(event) => setField('meetingUrl', event.target.value)}
          />
          <TextField
            label="Palavra-passe / código de acesso"
            size="small"
            value={form.meetingPassword}
            disabled={loading}
            onChange={(event) =>
              setField('meetingPassword', event.target.value)
            }
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
          <TextField
            select
            label="Recorrência"
            size="small"
            value={form.recurrence}
            disabled={loading}
            onChange={(event) => setField('recurrence', event.target.value)}
          >
            {recurrences.map((recurrence) => (
              <MenuItem key={recurrence.value} value={recurrence.value}>
                {recurrence.label}
              </MenuItem>
            ))}
          </TextField>
          <RichTextField
            label="Descrição"
            value={form.description}
            resetKey={`${lesson?.id ?? 'new'}-${loading}`}
            onChange={(description) => setField('description', description)}
          />
        </div>
        <div className="cacoin-student-form-actions online-classes-form-actions">
          <Button onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
          disabled={loading || saving || platformOptions.length === 0}
          >
            {saving
              ? 'A guardar…'
              : lesson
                ? 'Guardar alterações'
                : 'Registar aula'}
          </Button>
        </div>
      </form>
    </section>
  );
}
