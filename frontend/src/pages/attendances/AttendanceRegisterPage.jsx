import { isTeacherMode } from '../../utils/teacherMode';
import { systemDate } from '../../utils/systemDate';
import { useEffect, useState } from 'react';
import { Alert, Autocomplete, Button, TextField } from '@mui/material';
import CourseStudentPicker from '../../components/CourseStudentPicker';
import {
  createAttendanceRecord,
  getAttendanceTeachers,
  getCourses,
  getStudents,
  getTeacherProfile,
} from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import {
  attendanceStatusOptions,
  errorMessage,
} from './attendanceUtils';

const today = () => {
  const date = systemDate();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function AttendanceRegisterPage() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [picked, setPicked] = useState({ course: null, student: null });
  const [teacher, setTeacher] = useState(null);
  const [status, setStatus] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([getCourses(), getStudents()])
      .then(([loadedCourses, loadedStudents]) => {
        if (!mounted) return;
        setCourses(loadedCourses.filter((course) => course.active));
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

  const teacherMode = isTeacherMode();
  const [ownTeacherId, setOwnTeacherId] = useState(null);
  useEffect(() => {
    if (!teacherMode) return;
    getTeacherProfile()
      .then((profile) => setOwnTeacherId(profile.staff.id))
      .catch((loadError) => setError(errorMessage(loadError)));
  }, [teacherMode]);

  const courseId = picked.course?.id ?? null;
  useEffect(() => {
    let mounted = true;
    setTeacher(null);
    if (!courseId || teacherMode) {
      setTeachers([]);
      return () => {
        mounted = false;
      };
    }
    setLoadingTeachers(true);
    getAttendanceTeachers(courseId)
      .then((loaded) => {
        if (mounted) setTeachers(loaded);
      })
      .catch((loadError) => {
        if (mounted) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (mounted) setLoadingTeachers(false);
      });
    return () => {
      mounted = false;
    };
  }, [courseId, teacherMode]);

  const teacherId = teacherMode ? ownTeacherId : teacher?.id;

  const submitRecord = async (event) => {
    event.preventDefault();
    if (!picked.course || !picked.student || !teacherId || !status) {
      setError(teacherMode
        ? 'Selecione o curso, o estudante e o estado.'
        : 'Selecione o curso, o estudante, o professor e o estado.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const created = await createAttendanceRecord({
        studentId: picked.student.id,
        courseId: picked.course.id,
        teacherId,
        date: today(),
        status: status.value,
      });
      setNotice(`${status.label} registado para ${created.studentCode}.`);
      setPicked({ course: null, student: null });
      setTeacher(null);
      setStatus(null);
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
          <h1>Registar</h1>
        </div>
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {!loading && (!courses.length || !students.length) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {!courses.length && 'Não existem cursos ativos. '}
          {!students.length && 'Não existem estudantes ativos.'}
        </Alert>
      )}
      {!teacherMode && courseId && !loadingTeachers && teachers.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Não há professores activos atribuídos a este curso.
        </Alert>
      )}
      <form className="cacoin-test-registration-form" onSubmit={submitRecord}>
        <TextField
          size="small"
          label="Data"
          value={toDisplayDate(today())}
          slotProps={{ input: { readOnly: true } }}
        />
        <CourseStudentPicker
          key={formKey}
          courses={courses}
          students={students}
          onChange={setPicked}
        />
        {!teacherMode && (
          <Autocomplete
            options={teachers}
            value={teacher}
            onChange={(_, value) => setTeacher(value)}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            disabled={!courseId}
            loading={loadingTeachers}
            renderInput={(params) => (
              <TextField {...params} required label="Professor" size="small" />
            )}
          />
        )}
        <Autocomplete
          options={attendanceStatusOptions}
          value={status}
          onChange={(_, value) => setStatus(value)}
          getOptionLabel={(option) => option.label}
          isOptionEqualToValue={(option, value) => option.value === value.value}
          renderInput={(params) => (
            <TextField {...params} required label="Estado" size="small" />
          )}
        />
        <div className="cacoin-test-registration-actions">
          <Button type="submit" variant="contained" disabled={saving || loading}>
            {saving ? 'A guardar…' : 'Registar'}
          </Button>
        </div>
      </form>
    </section>
  );
}
