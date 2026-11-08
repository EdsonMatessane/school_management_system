import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Chip,
  createFilterOptions,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { ClipboardPen, Users } from 'lucide-react';
import FloatingPanel from '../../components/FloatingPanel';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import {
  getAssessmentEntries,
  getAssessmentGrades,
  getAssessmentSheets,
  saveAssessmentGrades,
} from '../../services/api';
import { displayText } from '../../utils/displayText';
import { filterBySearch } from '../../utils/search';
import {
  assessmentComponents,
  errorMessage,
  formatGrade,
  getGradeError,
  sanitizeGrade,
  sheetLabel,
  sheetNumbers,
  teachersLabel,
} from './assessmentUtils';

const filterStudents = createFilterOptions({
  stringify: (option) => `${option.studentCode} ${option.studentName}`,
  limit: 30,
});

const statusCodes = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'E1', 'E2', 'TR'];

// Componentes com nota separados por vírgula; "-" marca os que ainda não têm nota.
const statusText = (grades) => statusCodes
  .map((code) => (grades?.[code] ? code : '-'))
  .join(', ');

const columns = [
  { key: 'courseName', label: 'Curso' },
  { key: 'categoryName', label: 'Categoria' },
  { key: 'levelName', label: 'Nível' },
  { key: 'modalityName', label: 'Modalidade' },
  { key: 'teachers', label: 'Professor/es' },
  { key: 'progress', label: 'Progresso' },
  { key: 'actions', label: 'Acções', align: 'right' },
];

export default function AssessmentPendingPage() {
  const [sheets, setSheets] = useState([]);
  const [numbers, setNumbers] = useState({});
  const [tab, setTab] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [active, setActive] = useState(null);
  const [component, setComponent] = useState('T1');
  const [entries, setEntries] = useState([]);
  const [values, setValues] = useState({});
  const [dialogLoading, setDialogLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [notice, setNotice] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [viewOpen, setViewOpen] = useState(false);
  const [statusRows, setStatusRows] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  const loadSheets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const loaded = await getAssessmentSheets();
      setNumbers(sheetNumbers(loaded));
      setSheets(loaded.filter((item) => item.status === 'PENDING'));
      return loaded;
    } catch (loadError) {
      setError(errorMessage(loadError));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSheets();
  }, [loadSheets]);

  const loadEntries = useCallback(async (sheetId, code) => {
    setDialogLoading(true);
    setDialogError('');
    try {
      const loaded = await getAssessmentEntries(sheetId, code);
      setEntries(loaded);
      setValues(Object.fromEntries(loaded.map((entry) => [
        entry.studentId,
        entry.absent ? '-' : formatGrade(entry.grade),
      ])));
    } catch (loadError) {
      setDialogError(errorMessage(loadError));
    } finally {
      setDialogLoading(false);
    }
  }, []);

  const loadStatus = useCallback(async (sheet) => {
    if (!sheet) return;
    setStatusLoading(true);
    setStatusError('');
    try {
      setStatusRows(await getAssessmentGrades(sheet.courseId, sheet.academicYear, sheet.id));
    } catch (loadError) {
      setStatusError(errorMessage(loadError));
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const openStudents = () => {
    setViewOpen(true);
    loadStatus(active);
  };

  const closeSheet = () => {
    setViewOpen(false);
    setActive(null);
  };

  const openSheet = (sheet) => {
    setStudentFilter('');
    setViewOpen(false);
    setActive(sheet);
    setComponent('T1');
    setNotice('');
    loadEntries(sheet.id, 'T1');
  };

  const changeComponent = (_, code) => {
    setComponent(code);
    loadEntries(active.id, code);
  };

  const visibleEntries = useMemo(() => {
    const term = studentFilter.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter((entry) => (
      String(entry.studentCode ?? '').toLowerCase().includes(term)
      || String(entry.studentName ?? '').toLowerCase().includes(term)
    ));
  }, [entries, studentFilter]);

  const hasErrors = entries.some((entry) => getGradeError(values[entry.studentId] ?? ''));

  const saveAll = async () => {
    if (hasErrors) {
      setDialogError('Corrija as notas inválidas antes de guardar.');
      return;
    }
    setSaving(true);
    setDialogError('');
    try {
      const saved = await saveAssessmentGrades(active.id, component, {
        entries: entries.map((entry) => ({
          studentId: entry.studentId,
          grade: (values[entry.studentId] ?? '').trim(),
        })),
      });
      setEntries(saved);
      const refreshed = await loadSheets();
      const updated = refreshed.find((item) => item.id === active.id);
      setNotice(`${assessmentComponents.find((item) => item.code === component).label} guardado.`);
      if (updated) {
        setActive(updated);
        if (viewOpen) loadStatus(updated);
      } else {
        closeSheet();
      }
    } catch (saveError) {
      setDialogError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const tabs = useMemo(() => {
    const found = new Map();
    sheets.forEach((sheet) => {
      const number = numbers[sheet.id];
      const key = `${sheet.academicYear}-${number}`;
      if (!found.has(key)) found.set(key, { key, year: sheet.academicYear, number });
    });
    return [...found.values()].sort((a, b) => b.year - a.year || a.number - b.number);
  }, [sheets, numbers]);
  const activeTab = tabs.find((item) => item.key === tab) ?? tabs[0];

  const rows = useMemo(() => filterBySearch(
    sheets.filter((item) => activeTab
      && item.academicYear === activeTab.year && numbers[item.id] === activeTab.number),
    searchTerm,
    (item) => [
      item.courseName,
      item.categoryName,
      item.levelName,
      item.modalityName,
      teachersLabel(item.teachers),
    ],
  ), [sheets, numbers, activeTab, searchTerm]);

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>Registo Pendente</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
        </div>
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {tabs.length > 0 && (
        <Tabs
          value={activeTab.key}
          onChange={(_, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 1 }}
        >
          {tabs.map((item) => (
            <Tab key={item.key} value={item.key} label={sheetLabel(item.number, item.year)} />
          ))}
        </Tabs>
      )}
      <StandardTable
        audit="AssessmentSheet"
        ariaLabel="Registos de notas pendentes"
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar os dados.'
          : searchTerm.trim()
            ? 'Nenhum registo corresponde à pesquisa.'
            : 'Não existem registos pendentes.'}
        loading={loading}
        rows={rows}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{displayText(row.courseName)}</TableCell>
            <TableCell>{displayText(row.categoryName)}</TableCell>
            <TableCell>{displayText(row.levelName)}</TableCell>
            <TableCell>{displayText(row.modalityName)}</TableCell>
            <TableCell>{teachersLabel(row.teachers)}</TableCell>
            <TableCell>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {row.components.map((item) => (
                  <Chip
                    key={item.code}
                    size="small"
                    label={item.label}
                    color={item.total > 0 && item.graded >= item.total ? 'success' : 'default'}
                    variant={item.graded > 0 ? 'filled' : 'outlined'}
                  />
                ))}
              </Stack>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Lançar notas">
                <IconButton
                  aria-label={`Lançar notas de ${row.courseName}`}
                  onClick={() => openSheet(row)}
                >
                  <ClipboardPen size={17} />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog open={Boolean(active)} onClose={() => !saving && closeSheet()} fullWidth maxWidth="md">
        <DialogTitle>
          Lançar notas — {displayText(active?.courseName)} ({active ? sheetLabel(numbers[active.id], active.academicYear) : ''})
        </DialogTitle>
        <DialogContent>
          {dialogError && <Alert severity="error" sx={{ mb: 1 }}>{dialogError}</Alert>}
          {active && (
            <Tabs
              value={component}
              onChange={changeComponent}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 2 }}
            >
              {active.components.map((item) => (
                <Tab
                  key={item.code}
                  value={item.code}
                  label={`${item.label} (${item.graded}/${item.total})`}
                />
              ))}
            </Tabs>
          )}
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <Autocomplete
              freeSolo
              fullWidth
              size="small"
              options={entries}
              filterOptions={filterStudents}
              getOptionLabel={(option) => (typeof option === 'string' ? option : option.studentCode)}
              inputValue={studentFilter}
              onInputChange={(_, value) => setStudentFilter(value)}
              renderOption={(props, option) => (
                <li {...props} key={option.studentId}>
                  {option.studentCode} — {displayText(option.studentName)}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Código do estudante"
                />
              )}
            />
            <Button
              variant="outlined"
              startIcon={<Users size={17} />}
              onClick={openStudents}
              disabled={!active}
              sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Ver estudantes
            </Button>
          </Stack>
          <StandardTable
            ariaLabel="Notas do estudante"
            columns={[
              { key: 'studentCode', label: 'Código do Estudante' },
              { key: 'studentName', label: 'Nome' },
              { key: 'grade', label: 'Nota (0 a 20, ou -)' },
            ]}
            emptyMessage={studentFilter.trim()
              ? 'Nenhum estudante corresponde à pesquisa.'
              : 'Não há estudantes activos neste curso.'}
            loading={dialogLoading}
            rows={visibleEntries}
            renderRow={(entry, rowNumber) => {
              const value = values[entry.studentId] ?? '';
              const fieldError = getGradeError(value);
              return (
                <TableRow key={entry.studentId} hover>
                  <TableCell>{rowNumber}</TableCell>
                  <TableCell>{entry.studentCode}</TableCell>
                  <TableCell>{displayText(entry.studentName)}</TableCell>
                  <TableCell sx={{ width: 180 }}>
                    <TextField
                      size="small"
                      value={value}
                      error={Boolean(fieldError)}
                      helperText={fieldError || undefined}
                      onChange={(event) => setValues((current) => ({
                        ...current,
                        [entry.studentId]: sanitizeGrade(event.target.value),
                      }))}
                      slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                    />
                  </TableCell>
                </TableRow>
              );
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSheet} disabled={saving}>Fechar</Button>
          <Button variant="contained" onClick={saveAll} disabled={saving || dialogLoading}>
            {saving ? 'A guardar…' : 'Guardar notas'}
          </Button>
        </DialogActions>
      </Dialog>

      <FloatingPanel
        open={Boolean(active) && viewOpen}
        title={`Estudantes — ${displayText(active?.courseName)}`}
        onClose={() => setViewOpen(false)}
      >
        {statusError && <Alert severity="error" sx={{ mb: 1 }}>{statusError}</Alert>}
        <StandardTable
          ariaLabel="Estudantes do curso"
          columns={[
            { key: 'studentCode', label: 'Código do Estudante' },
            { key: 'studentName', label: 'Nome' },
            { key: 'status', label: 'Estado' },
          ]}
          emptyMessage="Não há estudantes activos neste curso."
          loading={statusLoading}
          rows={statusRows}
          renderRow={(row, rowNumber) => (
            <TableRow key={row.studentId} hover>
              <TableCell>{rowNumber}</TableCell>
              <TableCell>{row.studentCode}</TableCell>
              <TableCell>{displayText(row.studentName)}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{statusText(row.grades)}</TableCell>
            </TableRow>
          )}
        />
      </FloatingPanel>
    </section>
  );
}
