import { useEffect, useRef, useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { displayText } from '../../utils/displayText';
import { formatDuration } from './graduationUtils';

const studentName = (student) =>
  [student.firstName, student.surname].filter(Boolean).join(' ');
const optionsFor = (courses, idField, nameField, include) => {
  const options = new Map();
  courses.filter(include).forEach((course) => {
    options.set(String(course[idField]), displayText(course[nameField]));
  });
  return [...options].map(([id, label]) => ({ id, label }));
};

export default function GraduationStudentPicker({ courses, students, onChange }) {
  const [courseId, setCourseId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [modalityId, setModalityId] = useState('');
  const [student, setStudent] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const courseCandidates = categoryId && levelId && modalityId
    ? courses.filter((course) => (
      (!courseId || String(course.id) === courseId)
      && String(course.categoryId) === categoryId
      && String(course.levelId) === levelId
      && String(course.modalityId) === modalityId
    ))
    : [];
  const selectedCourse = courseCandidates.length === 1 ? courseCandidates[0] : undefined;

  useEffect(() => {
    onChangeRef.current({ course: selectedCourse ?? null, student });
  }, [selectedCourse, student]);

  const matchingCourses = courses.filter((course) => (
    (!categoryId || String(course.categoryId) === categoryId)
    && (!levelId || String(course.levelId) === levelId)
    && (!modalityId || String(course.modalityId) === modalityId)
  ));
  const categoryOptions = optionsFor(
    courses,
    'categoryId',
    'categoryName',
    (course) => (!levelId || String(course.levelId) === levelId)
      && (!modalityId || String(course.modalityId) === modalityId),
  );
  const levelOptions = optionsFor(
    courses,
    'levelId',
    'levelName',
    (course) => (!categoryId || String(course.categoryId) === categoryId)
      && (!modalityId || String(course.modalityId) === modalityId),
  );
  const modalityOptions = optionsFor(
    courses,
    'modalityId',
    'modalityName',
    (course) => (!categoryId || String(course.categoryId) === categoryId)
      && (!levelId || String(course.levelId) === levelId),
  );
  const enrolledStudents = selectedCourse
    ? students.filter((item) => String(item.courseId) === String(selectedCourse.id))
    : [];

  const resetStudent = () => {
    setStudent(null);
    setCodeInput('');
  };
  const changeCourse = (_, course) => {
    setCourseId(course ? String(course.id) : '');
    setCategoryId(course ? String(course.categoryId) : '');
    setLevelId(course ? String(course.levelId) : '');
    setModalityId(course ? String(course.modalityId) : '');
    resetStudent();
  };
  const changeDetail = (setter) => (_, option) => {
    setter(option?.id ?? '');
    setCourseId('');
    resetStudent();
  };
  const renderOptions = (label, value, options, onSelect) => (
    <Autocomplete
      options={options}
      value={options.find((option) => option.id === value) ?? null}
      onChange={onSelect}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      renderInput={(params) => (
        <TextField {...params} required label={label} size="small" />
      )}
    />
  );

  return (
    <>
      <Autocomplete
        options={matchingCourses}
        value={selectedCourse ?? null}
        onChange={changeCourse}
        getOptionLabel={(option) => displayText(option.name)}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderInput={(params) => (
          <TextField {...params} required label="Curso" size="small" />
        )}
      />
      {renderOptions('Categoria', categoryId, categoryOptions, changeDetail(setCategoryId))}
      {renderOptions('Nível', levelId, levelOptions, changeDetail(setLevelId))}
      {renderOptions('Modalidade', modalityId, modalityOptions, changeDetail(setModalityId))}
      <TextField
        size="small"
        label="Duração"
        value={selectedCourse ? formatDuration(selectedCourse.durationMonths) : ''}
        slotProps={{ input: { readOnly: true } }}
      />
      <Autocomplete
        options={enrolledStudents}
        value={student}
        inputValue={codeInput}
        onChange={(_, value) => {
          setStudent(value);
          setCodeInput(value?.studentCode ?? '');
        }}
        onInputChange={(_, value, reason) => {
          setCodeInput(value);
          if (reason === 'input') {
            setStudent(enrolledStudents.find((item) => item.studentCode === value) ?? null);
          }
        }}
        getOptionLabel={(item) => item.studentCode}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        disabled={!selectedCourse}
        renderInput={(params) => (
          <TextField {...params} required label="Código do Estudante" size="small" />
        )}
      />
      <TextField
        size="small"
        label="Nome"
        value={student ? displayText(studentName(student)) : ''}
        slotProps={{ input: { readOnly: true } }}
      />
    </>
  );
}
