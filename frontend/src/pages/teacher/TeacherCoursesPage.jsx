import { useEffect, useMemo, useState } from 'react';
import { Alert, TableCell, TableRow } from '@mui/material';
import DataExportMenu from '../../components/DataExportMenu';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import { getCourses } from '../../services/api';
import { displayText } from '../../utils/displayText';
import { filterBySearch } from '../../utils/search';

const columns = [
  { key: 'name', label: 'Curso' },
  { key: 'categoryName', label: 'Categoria' },
  { key: 'levelName', label: 'Nível' },
  { key: 'modalityName', label: 'Modalidade' },
];

export default function TeacherCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCourses()
      .then(setCourses)
      .catch(() => setError('Não foi possível carregar os cursos.'))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => filterBySearch(courses, searchTerm, (course) => [
    course.name,
    course.categoryName,
    course.levelName,
    course.modalityName,
  ]), [courses, searchTerm]);
  const exportRows = rows.map((course) => Object.fromEntries(
    columns.map(({ key }) => [key, displayText(course[key])]),
  ));

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Meus Cursos</p>
          <h1>Cursos</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={columns}
            rows={exportRows}
            filename="meus-cursos"
            title="Meus cursos"
            disabled={loading}
            onError={() => setError('Não foi possível exportar os dados.')}
          />
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <StandardTable
        ariaLabel="Meus cursos"
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar os dados.'
          : searchTerm.trim() ? 'Nenhum curso corresponde à pesquisa.' : 'Ainda não tem cursos associados.'}
        loading={loading}
        rows={rows}
        renderRow={(course, rowNumber) => (
          <TableRow key={course.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{course.name}</TableCell>
            <TableCell>{displayText(course.categoryName)}</TableCell>
            <TableCell>{displayText(course.levelName)}</TableCell>
            <TableCell>{displayText(course.modalityName)}</TableCell>
          </TableRow>
        )}
      />
    </section>
  );
}
