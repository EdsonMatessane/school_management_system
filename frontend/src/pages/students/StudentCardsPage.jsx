import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, IconButton, MenuItem, TableCell, TableRow, TextField, Tooltip } from '@mui/material';
import { Camera, CreditCard, FileDown, Trash2 } from 'lucide-react';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import {
  getCourses,
  getStudentCards,
  getStudents,
  recordStudentCardsIssued,
  removeStudentCardPhoto,
  saveStudentCardPhoto,
} from '../../services/api';
import { studentCardData } from '../../utils/cardData';
import { changeCourseFilters, relatedCourseOptions } from '../../utils/courseFilters';
import { displayText } from '../../utils/displayText';
import { preparePhoto } from '../../utils/photo';
import { loadCardInstitution } from '../../utils/reportHeader';
import { filterBySearch } from '../../utils/search';

const emptyFilters = { courseId: '', categoryId: '', levelId: '', modalityId: '' };
const columns = [
  { key: 'photo', label: 'Fotografia' },
  { key: 'code', label: 'Código do Estudante' },
  { key: 'name', label: 'Nome' },
  { key: 'actions', label: 'Ações', align: 'right' },
];

const errorText = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

/**
 * Gestão de Cartões (secretaria): escolhe-se o curso (categoria, nível e modalidade acompanham),
 * pesquisa-se pelo número do estudante, coloca-se a fotografia de cada cartão e exportam-se os
 * cartões em PDF: todos os do curso (folhas A4) ou os de um estudante (uma folha A5).
 */
export default function StudentCardsPage() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [institution, setInstitution] = useState({});
  const [filters, setFilters] = useState(emptyFilters);
  const [cards, setCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileInput = useRef(null);
  const uploadFor = useRef(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([getCourses(), getStudents(), loadCardInstitution()])
      .then(([loadedCourses, loadedStudents, loadedInstitution]) => {
        if (!mounted) return;
        setCourses(loadedCourses.filter((course) => course.active));
        setStudents(loadedStudents.filter((student) => student.active));
        setInstitution(loadedInstitution);
      })
      .catch((loadError) => { if (mounted) setError(errorText(loadError, 'Não foi possível carregar os dados.')); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const selectedCourse = courses.find((course) => String(course.id) === filters.courseId);
  const relatedOptions = useMemo(
    () => relatedCourseOptions(courses, selectedCourse),
    [courses, selectedCourse],
  );
  const hasLevel = !selectedCourse || selectedCourse.levelId != null;
  // O curso só vale se categoria, nível e modalidade escolhidos correspondem mesmo a ele.
  const activeCourse = courses.find((course) => (
    String(course.id) === filters.courseId
    && String(course.categoryId) === filters.categoryId
    && String(course.levelId) === filters.levelId
    && String(course.modalityId) === filters.modalityId
  ));
  const courseStudentIds = useMemo(
    () => (activeCourse
      ? students.filter((student) => student.courseId === activeCourse.id).map((student) => student.id)
      : []),
    [activeCourse, students],
  );

  useEffect(() => {
    let mounted = true;
    setSearchTerm('');
    setNotice('');
    if (!courseStudentIds.length) {
      setCards([]);
      return undefined;
    }
    setLoadingCards(true);
    getStudentCards(courseStudentIds)
      .then((loaded) => { if (mounted) { setCards(loaded); setError(''); } })
      .catch((loadError) => { if (mounted) setError(errorText(loadError, 'Não foi possível carregar os cartões.')); })
      .finally(() => { if (mounted) setLoadingCards(false); });
    return () => { mounted = false; };
  }, [courseStudentIds]);

  const rows = useMemo(
    () => filterBySearch(cards, searchTerm, (card) => [card.code, card.name]),
    [cards, searchTerm],
  );

  const changeFilter = (key) => (event) => {
    const { value } = event.target;
    setFilters((current) => changeCourseFilters(courses, current, key, value));
  };

  const chooseFile = (card) => {
    uploadFor.current = card;
    fileInput.current?.click();
  };

  const patchCard = (code, photo) => setCards((current) => (
    current.map((card) => (card.code === code ? { ...card, photo } : card))
  ));

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    const card = uploadFor.current;
    if (!file || !card) return;
    const studentId = students.find((student) => student.studentCode === card.code)?.id;
    setBusyId(card.code);
    setError('');
    setNotice('');
    try {
      const photo = await preparePhoto(file);
      await saveStudentCardPhoto(studentId, photo);
      patchCard(card.code, photo);
      setNotice(`Fotografia de ${card.code} guardada.`);
    } catch (photoError) {
      setError(errorText(photoError, 'Não foi possível guardar a fotografia.'));
    } finally {
      setBusyId(null);
    }
  };

  const removePhoto = async (card) => {
    const studentId = students.find((student) => student.studentCode === card.code)?.id;
    setBusyId(card.code);
    setError('');
    setNotice('');
    try {
      await removeStudentCardPhoto(studentId);
      patchCard(card.code, null);
      setNotice(`Fotografia de ${card.code} removida.`);
    } catch (photoError) {
      setError(errorText(photoError, 'Não foi possível remover a fotografia.'));
    } finally {
      setBusyId(null);
    }
  };

  const exportCourse = async () => {
    setExporting(true);
    setError('');
    try {
      const { exportCardsSheet } = await import('../../utils/cardPdf');
      exportCardsSheet(
        cards.map((card) => studentCardData(card, institution)),
        `cartoes-${displayText(activeCourse.name).replace(/\s+/g, '-').toLowerCase()}`,
      );
      recordStudentCardsIssued(courseStudentIds);
    } catch (exportError) {
      setError(errorText(exportError, 'Não foi possível gerar os cartões.'));
    } finally {
      setExporting(false);
    }
  };

  const exportOne = async (card) => {
    setBusyId(card.code);
    setError('');
    try {
      const { exportCardA5 } = await import('../../utils/cardPdf');
      exportCardA5(studentCardData(card, institution));
      const studentId = students.find((student) => student.studentCode === card.code)?.id;
      if (studentId) recordStudentCardsIssued([studentId]);
    } catch (exportError) {
      setError(errorText(exportError, 'Não foi possível gerar o cartão.'));
    } finally {
      setBusyId(null);
    }
  };

  const filtersChosen = Boolean(filters.courseId);

  return (
    <section className="cacoin-course-page cacoin-tasks-page cacoin-task-dashboard cacoin-tests-dashboard">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>Gestão de Cartões</h1>
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}
      <section className="cacoin-task-dashboard-panel cacoin-tests-dashboard-filters">
        <header>
          <div>
            <h2>Filtros</h2>
          </div>
          <CreditCard size={20} aria-hidden="true" />
        </header>
        <div className="cacoin-tests-dashboard-filter-grid">
          <TextField select size="small" label="Curso" value={filters.courseId} onChange={changeFilter('courseId')}>
            {courses.map((course) => (
              <MenuItem key={course.id} value={String(course.id)}>{displayText(course.name)}</MenuItem>
            ))}
          </TextField>
          <TextField
            select size="small" label="Categoria" value={filters.categoryId}
            disabled={!selectedCourse} onChange={changeFilter('categoryId')}
          >
            {relatedOptions.categories.map((category) => (
              <MenuItem key={category.id} value={String(category.id)}>{displayText(category.name)}</MenuItem>
            ))}
          </TextField>
          {hasLevel && (
            <TextField
              select size="small" label="Nível" value={filters.levelId}
              disabled={!selectedCourse} onChange={changeFilter('levelId')}
            >
              {relatedOptions.levels.map((level) => (
                <MenuItem key={level.id} value={String(level.id)}>{displayText(level.name)}</MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            select size="small" label="Modalidade" value={filters.modalityId}
            disabled={!selectedCourse} onChange={changeFilter('modalityId')}
          >
            {relatedOptions.modalities.map((modality) => (
              <MenuItem key={modality.id} value={String(modality.id)}>{displayText(modality.name)}</MenuItem>
            ))}
          </TextField>
        </div>
      </section>

      {loading && <p>A carregar…</p>}
      {!loading && !filtersChosen && (
        <Alert severity="info" icon={false}>Escolha o curso para ver os cartões dos seus estudantes.</Alert>
      )}
      {!loading && filtersChosen && !activeCourse && (
        <Alert severity="warning" icon={false}>Não existe um curso com esta combinação de categoria, nível e modalidade.</Alert>
      )}
      {activeCourse && (
        <section className="cacoin-task-dashboard-panel">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <SearchField label="Número do estudante" value={searchTerm} onChange={setSearchTerm} />
            <Button
              variant="contained"
              startIcon={<FileDown size={17} />}
              onClick={exportCourse}
              disabled={exporting || loadingCards || cards.length === 0}
            >
              {exporting ? 'A gerar…' : `Exportar cartões do curso (PDF) · ${cards.length}`}
            </Button>
          </div>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFile} />
          <StandardTable
            ariaLabel="Cartões dos estudantes do curso"
            columns={columns}
            rows={rows}
            emptyMessage={loadingCards
              ? 'A carregar cartões…'
              : searchTerm.trim()
                ? 'Nenhum estudante corresponde à pesquisa.'
                : 'Este curso ainda não tem estudantes ativos.'}
            renderRow={(card, rowNumber) => (
              <TableRow key={card.code} hover>
                <TableCell>{rowNumber}</TableCell>
                <TableCell>
                  {card.photo
                    ? <img src={card.photo} alt="" width="38" height="48" style={{ objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                    : <span style={{ color: '#64748b' }}>Sem fotografia</span>}
                </TableCell>
                <TableCell>{card.code}</TableCell>
                <TableCell>{displayText(card.name)}</TableCell>
                <TableCell align="right">
                  <Tooltip title={card.photo ? 'Alterar fotografia' : 'Carregar fotografia'}>
                    <span>
                      <IconButton aria-label={`Carregar fotografia de ${card.code}`} disabled={busyId === card.code} onClick={() => chooseFile(card)}>
                        <Camera size={18} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {card.photo && (
                    <Tooltip title="Remover fotografia">
                      <span>
                        <IconButton aria-label={`Remover fotografia de ${card.code}`} color="error" disabled={busyId === card.code} onClick={() => removePhoto(card)}>
                          <Trash2 size={18} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  <Tooltip title="Exportar cartão (PDF, A5)">
                    <span>
                      <IconButton aria-label={`Exportar cartão de ${card.code}`} disabled={busyId === card.code} onClick={() => exportOne(card)}>
                        <FileDown size={18} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )}
          />
        </section>
      )}
    </section>
  );
}
