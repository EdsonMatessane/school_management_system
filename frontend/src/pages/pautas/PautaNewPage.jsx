import { systemDate } from '../../utils/systemDate';
import { useEffect, useState } from 'react';
import { Alert, Autocomplete, Button, TextField } from '@mui/material';
import CourseSelector from '../../components/CourseSelector';
import {
  createPauta,
  getCourses,
  getPautaPreview,
  getStudents,
} from '../../services/api';
import { displayText } from '../../utils/displayText';
import { errorMessage, formatGrade, resultLabels } from './pautaUtils';

const studentName = (student) =>
  [student.firstName, student.surname].filter(Boolean).join(' ');
const readOnly = { input: { readOnly: true } };

export default function PautaNewPage() {
  const year = systemDate().getFullYear();
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [course, setCourse] = useState(null);
  const [student, setStudent] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [preview, setPreview] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([getCourses(), getStudents()])
      .then(([loadedCourses, loadedStudents]) => {
        if (!mounted) return;
        setCourses(loadedCourses.filter((item) => item.active));
        setStudents(loadedStudents.filter((item) => item.active));
      })
      .catch((loadError) => {
        if (mounted) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const classStudents = course
    ? students.filter((item) => String(item.courseId) === String(course.id))
    : [];

  const studentId = student?.id ?? null;
  useEffect(() => {
    let mounted = true;
    if (!studentId) {
      setPreview(null);
      return () => {
        mounted = false;
      };
    }
    getPautaPreview(studentId, year)
      .then((loaded) => {
        if (mounted) setPreview(loaded);
      })
      .catch((loadError) => {
        if (mounted) setError(errorMessage(loadError));
      });
    return () => {
      mounted = false;
    };
  }, [studentId, year]);

  const changeCourse = (selected) => {
    setCourse(selected);
    setStudent(null);
    setCodeInput('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!student || !preview?.complete) {
      setError('Seleccione um estudante com todas as notas lançadas.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const created = await createPauta({ studentId: student.id, year });
      setNotice(`Pauta ${year} lançada para ${created.studentCode}: ${resultLabels[created.result]}.`);
      setCourse(null);
      setStudent(null);
      setCodeInput('');
      setPreview(null);
      setFormKey((current) => current + 1);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const value = (grade) => (preview ? formatGrade(grade) : '');

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>Nova Pauta</h1>
        </div>
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {preview && !preview.complete && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Notas incompletas: falta {preview.missing.join(', ')}.
        </Alert>
      )}
      <form className="cacoin-test-registration-form" onSubmit={submit}>
        <CourseSelector key={formKey} courses={courses} onChange={changeCourse} />
        <Autocomplete
          options={classStudents}
          value={student}
          inputValue={codeInput}
          onChange={(_, selected) => {
            setStudent(selected);
            setCodeInput(selected?.studentCode ?? '');
          }}
          onInputChange={(_, text, reason) => {
            setCodeInput(text);
            if (reason === 'input') {
              setStudent(classStudents.find((item) => item.studentCode === text) ?? null);
            }
          }}
          getOptionLabel={(item) => item.studentCode}
          isOptionEqualToValue={(option, selected) => option.id === selected.id}
          disabled={!course}
          renderInput={(params) => (
            <TextField {...params} required label="Código do Estudante" size="small" />
          )}
        />
        <TextField
          size="small"
          label="Nome"
          value={student ? displayText(studentName(student)) : ''}
          slotProps={readOnly}
        />
        {['t1', 't2', 't3', 't4', 't5', 't6'].map((key) => (
          <TextField
            key={key}
            size="small"
            label={key.toUpperCase()}
            value={value(preview?.[key])}
            slotProps={readOnly}
          />
        ))}
        <TextField size="small" label="Frequência" value={value(preview?.frequency)} slotProps={readOnly} />
        <TextField size="small" label="Exame1" value={value(preview?.exam1)} slotProps={readOnly} />
        <TextField size="small" label="Exame2" value={value(preview?.exam2)} slotProps={readOnly} />
        <TextField size="small" label="Trabalho" value={value(preview?.work)} slotProps={readOnly} />
        <TextField size="small" label="Média Final" value={value(preview?.finalAverage)} slotProps={readOnly} />
        <TextField
          size="small"
          label="Resultado"
          value={preview?.result ? resultLabels[preview.result] : ''}
          slotProps={readOnly}
        />
        <div className="cacoin-test-registration-actions">
          <Button
            type="submit"
            variant="contained"
            disabled={saving || loading || !preview?.complete}
          >
            {saving ? 'A lançar…' : 'Lançar pauta'}
          </Button>
        </div>
      </form>
    </section>
  );
}
