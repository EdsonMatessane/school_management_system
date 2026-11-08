import { useEffect, useMemo, useState } from 'react';
import { Alert, Autocomplete, TableCell, TableRow, TextField } from '@mui/material';
import DataExportMenu from '../../components/DataExportMenu';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import StatusBadge from '../../components/StatusBadge';
import { getCourses, getStudents } from '../../services/api';
import { displayText } from '../../utils/displayText';
import { filterBySearch } from '../../utils/search';

const columns = [
  { key: 'studentCode', label: 'Código' },
  { key: 'name', label: 'Nome' },
  { key: 'phone', label: 'Telefone' },
  { key: 'courseName', label: 'Curso' },
  { key: 'categoryName', label: 'Categoria' },
  { key: 'levelName', label: 'Nível' },
  { key: 'modalityName', label: 'Modalidade' },
  { key: 'status', label: 'Estado' },
];

const fullName = (student) => [student.firstName, student.surname]
  .filter(Boolean)
  .join(' ');
const unique = (items) => [...new Set(items.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filters, setFilters] = useState({ course: null, category: null, level: null, modality: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getStudents(), getCourses()])
      .then(([loadedStudents, loadedCourses]) => {
        setStudents(loadedStudents);
        setCourses(loadedCourses);
      })
      .catch(() => setError('Não foi possível carregar os estudantes.'))
      .finally(() => setLoading(false));
  }, []);

  // As opções de cada filtro dependem dos outros filtros já escolhidos.
  const matching = (skip) => courses.filter((course) => (
    (skip === 'course' || !filters.course || course.name === filters.course)
    && (skip === 'category' || !filters.category || course.categoryName === filters.category)
    && (skip === 'level' || !filters.level || course.levelName === filters.level)
    && (skip === 'modality' || !filters.modality || course.modalityName === filters.modality)
  ));
  const options = {
    course: unique(matching('course').map((course) => course.name)),
    category: unique(matching('category').map((course) => course.categoryName)),
    level: unique(matching('level').map((course) => course.levelName)),
    modality: unique(matching('modality').map((course) => course.modalityName)),
  };

  const rows = useMemo(() => filterBySearch(
    students.filter((student) => (
      (!filters.course || student.courseName === filters.course)
      && (!filters.category || student.categoryName === filters.category)
      && (!filters.level || student.levelName === filters.level)
      && (!filters.modality || student.modalityName === filters.modality)
    )),
    searchTerm,
    (student) => [student.studentCode, fullName(student), student.phone, student.courseName],
  ), [students, filters, searchTerm]);

  const exportColumns = columns;
  const exportRows = rows.map((student) => ({
    studentCode: student.studentCode,
    name: fullName(student),
    phone: displayText(student.phone),
    courseName: displayText(student.courseName),
    categoryName: displayText(student.categoryName),
    levelName: displayText(student.levelName),
    modalityName: displayText(student.modalityName),
    status: student.active ? 'Activo' : 'Inactivo',
  }));

  // Ao escolher o curso, a categoria, o nível e a modalidade ficam preenchidos.
  const setFilter = (key) => (_, value) => setFilters((current) => {
    if (key !== 'course') return { ...current, [key]: value };
    const matches = courses.filter((course) => course.name === value);
    const only = (field) => {
      const values = unique(matches.map((course) => course[field]));
      return values.length === 1 ? values[0] : null;
    };
    return {
      course: value,
      category: value ? only('categoryName') : null,
      level: value ? only('levelName') : null,
      modality: value ? only('modalityName') : null,
    };
  });
  const filterField = (key, label) => (
    <Autocomplete
      key={key}
      size="small"
      options={options[key]}
      value={filters[key]}
      onChange={setFilter(key)}
      disabled={loading}
      renderInput={(params) => <TextField {...params} label={label} size="small" />}
    />
  );

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>Lista</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename="meus-estudantes"
            title="Meus estudantes"
            disabled={loading}
            onError={() => setError('Não foi possível exportar os dados.')}
          />
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <div className="cacoin-test-registration-form" style={{ marginBottom: 16 }}>
        {filterField('course', 'Curso')}
        {filterField('category', 'Categoria')}
        {filterField('level', 'Nível')}
        {filterField('modality', 'Modalidade')}
      </div>
      <StandardTable
        ariaLabel="Meus estudantes"
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar os dados.'
          : 'Nenhum estudante encontrado.'}
        loading={loading}
        rows={rows}
        renderRow={(student, rowNumber) => (
          <TableRow key={student.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{student.studentCode}</TableCell>
            <TableCell>{fullName(student)}</TableCell>
            <TableCell>{displayText(student.phone)}</TableCell>
            <TableCell>{displayText(student.courseName)}</TableCell>
            <TableCell>{displayText(student.categoryName)}</TableCell>
            <TableCell>{displayText(student.levelName)}</TableCell>
            <TableCell>{displayText(student.modalityName)}</TableCell>
            <TableCell>
              <StatusBadge
                label={student.active ? 'Activo' : 'Inactivo'}
                tone={student.active ? 'paid' : 'rejected'}
              />
            </TableCell>
          </TableRow>
        )}
      />
    </section>
  );
}
