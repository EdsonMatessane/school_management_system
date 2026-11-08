const unique = (items, idField, nameField) => [...new Map(items.map((course) => [
  course[idField],
  { id: course[idField], name: course[nameField] },
])).values()];

/**
 * Opções de categoria, nível e modalidade para o curso escolhido. Se existirem cursos com o
 * mesmo nome noutros níveis ou modalidades, também ficam disponíveis para troca manual.
 */
export const relatedCourseOptions = (courses, selectedCourse) => {
  if (!selectedCourse) return { categories: [], levels: [], modalities: [] };
  const siblings = courses.filter((course) => course.name === selectedCourse.name);
  return {
    categories: unique(siblings, 'categoryId', 'categoryName'),
    levels: unique(siblings, 'levelId', 'levelName'),
    modalities: unique(siblings, 'modalityId', 'modalityName'),
  };
};

const empty = { courseId: '', categoryId: '', levelId: '', modalityId: '' };

/** Ao escolher o curso, preenche categoria, nível e modalidade automaticamente. */
export const filtersForCourse = (courses, courseId) => {
  const course = courses.find((item) => String(item.id) === String(courseId));
  return course
    ? {
      courseId: String(course.id),
      categoryId: String(course.categoryId),
      levelId: String(course.levelId),
      modalityId: String(course.modalityId),
    }
    : { ...empty };
};

/**
 * Altera um filtro. Escolher o curso preenche os restantes; mudar categoria, nível ou
 * modalidade passa para o curso do mesmo nome que corresponde à nova combinação.
 */
export const changeCourseFilters = (courses, current, key, value) => {
  if (key === 'courseId') return filtersForCourse(courses, value);
  const next = { ...current, [key]: value };
  const base = courses.find((course) => String(course.id) === current.courseId);
  const match = base && courses.find((course) => (
    course.name === base.name
    && String(course.categoryId) === next.categoryId
    && String(course.levelId) === next.levelId
    && String(course.modalityId) === next.modalityId
  ));
  return match ? { ...next, courseId: String(match.id) } : next;
};
