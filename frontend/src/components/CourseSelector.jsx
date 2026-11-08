import { useEffect, useRef, useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { displayText } from '../utils/displayText';

const optionsFor = (courses, idField, nameField, include) => {
  const options = new Map();
  courses.filter(include).forEach((course) => {
    options.set(String(course[idField]), displayText(course[nameField]));
  });
  return [...options].map(([id, label]) => ({ id, label }));
};

export default function CourseSelector({ courses, onChange, size = 'small' }) {
  const [courseId, setCourseId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [modalityId, setModalityId] = useState('');
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const candidates = categoryId && levelId && modalityId
    ? courses.filter((course) => (
      (!courseId || String(course.id) === courseId)
      && String(course.categoryId) === categoryId
      && String(course.levelId) === levelId
      && String(course.modalityId) === modalityId
    ))
    : [];
  const selectedCourse = candidates.length === 1 ? candidates[0] : undefined;

  useEffect(() => {
    onChangeRef.current(selectedCourse ?? null);
  }, [selectedCourse]);

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

  const changeCourse = (_, course) => {
    setCourseId(course ? String(course.id) : '');
    setCategoryId(course ? String(course.categoryId) : '');
    setLevelId(course ? String(course.levelId) : '');
    setModalityId(course ? String(course.modalityId) : '');
  };
  const changeDetail = (setter) => (_, option) => {
    setter(option?.id ?? '');
    setCourseId('');
  };
  const renderOptions = (label, value, options, onSelect) => (
    <Autocomplete
      options={options}
      value={options.find((option) => option.id === value) ?? null}
      onChange={onSelect}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      renderInput={(params) => (
        <TextField {...params} required label={label} size={size} />
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
          <TextField {...params} required label="Curso" size={size} />
        )}
      />
      {renderOptions('Categoria', categoryId, categoryOptions, changeDetail(setCategoryId))}
      {renderOptions('Nível', levelId, levelOptions, changeDetail(setLevelId))}
      {renderOptions('Modalidade', modalityId, modalityOptions, changeDetail(setModalityId))}
    </>
  );
}
