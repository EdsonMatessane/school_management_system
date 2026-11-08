import { useEffect, useState } from 'react';
import { Alert, Button, TextField } from '@mui/material';
import CourseSelector from '../../components/CourseSelector';
import {
  createAssessmentSheet,
  getAssessmentTeachers,
  getCourses,
} from '../../services/api';
import { displayText } from '../../utils/displayText';
import { errorMessage, teachersLabel } from './assessmentUtils';

export default function AssessmentNewRecordPage() {
  const [courses, setCourses] = useState([]);
  const [course, setCourse] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [formKey, setFormKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let mounted = true;
    getCourses()
      .then((loaded) => {
        if (mounted) setCourses(loaded.filter((item) => item.active));
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

  const courseId = course?.id ?? null;
  useEffect(() => {
    let mounted = true;
    if (!courseId) {
      setTeachers([]);
      return () => {
        mounted = false;
      };
    }
    getAssessmentTeachers(courseId)
      .then((loaded) => {
        if (mounted) setTeachers(loaded);
      })
      .catch((loadError) => {
        if (mounted) setError(errorMessage(loadError));
      });
    return () => {
      mounted = false;
    };
  }, [courseId]);

  const submit = async (event) => {
    event.preventDefault();
    if (!course) {
      setError('Selecione o curso, a categoria, o nível e a modalidade.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const created = await createAssessmentSheet({ courseId: course.id });
      setNotice(`Registo de ${created.academicYear} criado para ${displayText(created.courseName)}. Está em Registo Pendente.`);
      setCourse(null);
      setFormKey((current) => current + 1);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>Novo Registo</h1>
        </div>
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {course && teachers.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Não há professores activos atribuídos a este curso.
        </Alert>
      )}
      <form className="cacoin-test-registration-form" onSubmit={submit}>
        <CourseSelector key={formKey} courses={courses} onChange={setCourse} />
        <TextField
          size="small"
          label="Professor/es"
          value={course ? teachersLabel(teachers) : ''}
          slotProps={{ input: { readOnly: true } }}
        />
        <div className="cacoin-test-registration-actions">
          <Button
            type="submit"
            variant="contained"
            disabled={saving || loading || !course || teachers.length === 0}
          >
            {saving ? 'A guardar…' : 'Criar registo'}
          </Button>
        </div>
      </form>
    </section>
  );
}
