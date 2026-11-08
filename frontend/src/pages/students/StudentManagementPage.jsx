import DetailList from '../../components/DetailList';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Power, Trash2, UsersRound } from 'lucide-react';
import {
  Alert,
  Button,
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
  Tooltip,
} from '@mui/material';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import DataExportMenu from '../../components/DataExportMenu';
import { deleteStudent, getStudents, setStudentActive } from '../../services/api';
import { filterBySearch } from '../../utils/search';
import { toDisplayDate } from '../../utils/date';
import Money from '../../components/Money';
import { formatMoney as formatMoneyValue } from '../../utils/money';

const columns = [
  { key: 'studentCode', label: 'Código do Estudante' },
  { key: 'name', label: 'Nome' },
  { key: 'fatherName', label: 'Nome do Pai' },
  { key: 'motherName', label: 'Nome da Mãe' },
  { key: 'gender', label: 'Género' },
  { key: 'birthDate', label: 'Data de Nascimento' },
  { key: 'biNumber', label: 'Número de BI' },
  { key: 'issueDate', label: 'Data de Emissão' },
  { key: 'expiryDate', label: 'Data de Validade' },
  { key: 'nuit', label: 'NUIT' },
  { key: 'country', label: 'País' },
  { key: 'naturality', label: 'Naturalidade' },
  { key: 'addressProvince', label: 'Província' },
  { key: 'addressDistrict', label: 'Distrito' },
  { key: 'address', label: 'Endereço' },
  { key: 'phone', label: 'Telefone' },
  { key: 'email', label: 'Email' },
  { key: 'courseName', label: 'Curso' },
  { key: 'categoryName', label: 'Categoria' },
  { key: 'levelName', label: 'Nível' },
  { key: 'modalityName', label: 'Modalidade' },
  { key: 'duration', label: 'Duração' },
  { key: 'enrollmentDate', label: 'Data de Inscrição' },
  { key: 'monthlyFeeAmount', label: 'Mensalidade' },
  { key: 'monthlyFeeType', label: 'Tipo de Mensalidade' },
  { key: 'enrollmentFeeAmount', label: 'Taxa de Inscrição' },
  { key: 'enrollmentFeeType', label: 'Tipo de Taxa de Inscrição' },
  { key: 'manualFeeType', label: 'Tipo de Valor do Manual' },
  { key: 'manualFeeAmount', label: 'Valor do Manual' },
  { key: 'actions', label: 'Ações', align: 'right' },
];

const exportColumns = columns.filter(({ key }) => key !== 'actions');

const personalDetailFields = [
  ['Código do Estudante', (student) => student.studentCode],
  ['Nome', (student) => [student.firstName, student.surname].filter(Boolean).join(' ')],
  ['Nome do Pai', (student) => student.fatherName],
  ['Nome da Mãe', (student) => student.motherName],
  ['Género', (student) => student.gender],
  ['Data de Nascimento', (student) => formatDate(student.birthDate)],
  ['Número de BI', (student) => student.biNumber],
  ['Data de Emissão', (student) => formatDate(student.issueDate)],
  ['Data de Validade', (student) => formatDate(student.expiryDate)],
  ['NUIT', (student) => student.nuit],
  ['País', (student) => student.country],
  ['Naturalidade', (student) => joinLocation(student.birthDistrict, student.birthProvince)],
];

const addressDetailFields = [
  ['Província', (student) => student.addressProvince],
  ['Distrito', (student) => student.addressDistrict],
  ['Endereço', (student) => student.address],
  ['Telefone', (student) => student.phone],
  ['Email', (student) => student.email],
];

const courseDetailFields = [
  ['Curso', (student) => student.courseName],
  ['Categoria', (student) => student.categoryName],
  ['Nível', (student) => student.levelName],
  ['Modalidade', (student) => student.modalityName],
  ['Duração', (student) => formatDuration(student.durationMonths)],
  ['Mensalidade', (student) => formatMoney(student.monthlyFeeAmount)],
  ['Tipo de Mensalidade', (student) => student.monthlyFeeType],
  ['Taxa de Inscrição', (student) => formatMoney(student.enrollmentFeeAmount)],
  ['Tipo de Taxa de Inscrição', (student) => student.enrollmentFeeType],
  ['Tipo de Valor do Manual', (student) => student.manualFeeType],
  ['Valor do Manual', (student) => formatMoney(student.manualFeeAmount)],
];

const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível carregar os estudantes.';

function displayValue(value) {
  return value == null || value === '' ? '—' : value;
}

function formatDate(value) {
  return toDisplayDate(value);
}

function formatEnrollmentDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('pt-MZ', {
    timeZone: 'Africa/Maputo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('day')}/${part('month')}/${part('year')} | ${part('hour')}:${part('minute')}`;
}

function joinLocation(district, province) {
  return [district, province].filter(Boolean).join(', ');
}

function formatDuration(months) {
  if (!months) return '';
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years && remainingMonths) {
    return `${years} ${years === 1 ? 'ano' : 'anos'} e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
  }
  if (years) return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  return `${months} ${months === 1 ? 'mês' : 'meses'}`;
}

const formatMoney = (value) => formatMoneyValue(value, { empty: '' });

export default function StudentManagementPage({
  historyMode = false,
  onEdit,
  onEnroll,
  onStatusChanged,
  successMessage,
}) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailsTab, setDetailsTab] = useState(0);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setStudents(await getStudents());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filteredStudents = useMemo(
    () => filterBySearch(
      students.filter((student) => (historyMode ? !student.active : student.active)),
      searchTerm,
      (student) => [
      ...Object.values(student).filter((value) => value != null),
      joinLocation(student.birthDistrict, student.birthProvince),
      formatDuration(student.durationMonths),
      formatMoney(student.monthlyFeeAmount),
      formatMoney(student.enrollmentFeeAmount),
      formatMoney(student.manualFeeAmount),
      ],
    ),
    [students, searchTerm, historyMode],
  );

  const exportRows = useMemo(() => filteredStudents.map((student) => ({
    studentCode: displayValue(student.studentCode),
    name: displayValue([student.firstName, student.surname].filter(Boolean).join(' ')),
    fatherName: displayValue(student.fatherName),
    motherName: displayValue(student.motherName),
    gender: displayValue(student.gender),
    birthDate: displayValue(formatDate(student.birthDate)),
    biNumber: displayValue(student.biNumber),
    issueDate: displayValue(formatDate(student.issueDate)),
    expiryDate: displayValue(formatDate(student.expiryDate)),
    nuit: displayValue(student.nuit),
    country: displayValue(student.country),
    naturality: displayValue(joinLocation(student.birthDistrict, student.birthProvince)),
    addressProvince: displayValue(student.addressProvince),
    addressDistrict: displayValue(student.addressDistrict),
    address: displayValue(student.address),
    phone: displayValue(student.phone),
    email: displayValue(student.email),
    courseName: displayValue(student.courseName),
    categoryName: displayValue(student.categoryName),
    levelName: displayValue(student.levelName),
    modalityName: displayValue(student.modalityName),
    duration: displayValue(formatDuration(student.durationMonths)),
    enrollmentDate: formatEnrollmentDate(student.enrollmentDate),
    monthlyFeeAmount: displayValue(formatMoney(student.monthlyFeeAmount)),
    monthlyFeeType: displayValue(student.monthlyFeeType),
    enrollmentFeeAmount: displayValue(formatMoney(student.enrollmentFeeAmount)),
    enrollmentFeeType: displayValue(student.enrollmentFeeType),
    manualFeeType: displayValue(student.manualFeeType),
    manualFeeAmount: displayValue(formatMoney(student.manualFeeAmount)),
  })), [filteredStudents]);

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    setDeleting(true);
    setActionError('');
    try {
      await deleteStudent(studentToDelete.id);
      setStudentToDelete(null);
      await loadStudents();
    } catch (deleteError) {
      setActionError(getErrorMessage(deleteError));
    } finally {
      setDeleting(false);
    }
  };

  const toggleStudentStatus = async (student) => {
    setUpdatingStatusId(student.id);
    setActionError('');
    try {
      await setStudentActive(student.id, !student.active);
      onStatusChanged?.(student, !student.active);
    } catch (statusError) {
      setActionError(getErrorMessage(statusError));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>{historyMode ? 'Histórico' : 'Gerir'}</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename={historyMode ? 'historico-estudantes' : 'estudantes'}
            title={historyMode ? 'Histórico de Estudantes' : 'Lista de Estudantes'}
            disabled={loading}
            onError={(exportError) => setActionError(exportError.message)}
          />
          {!historyMode && (
            <Button variant="contained" startIcon={<Plus size={17} />} onClick={onEnroll}>
              Inscrever estudante
            </Button>
          )}
        </div>
      </header>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <StandardTable
        audit="Student"
        ariaLabel="Lista de estudantes"
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar os estudantes.'
          : searchTerm.trim()
            ? 'Nenhum estudante corresponde à pesquisa.'
            : historyMode
              ? 'Ainda não existem estudantes no histórico.'
              : 'Ainda não existem estudantes ativos.'}
        loading={loading}
        rows={filteredStudents}
        renderRow={(student, rowNumber) => (
          <TableRow key={student.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{student.studentCode}</TableCell>
            <TableCell>
              <span className="cacoin-level-name">
                <UsersRound size={17} aria-hidden="true" />
                {displayValue([student.firstName, student.surname].filter(Boolean).join(' '))}
              </span>
            </TableCell>
            <TableCell>{displayValue(student.fatherName)}</TableCell>
            <TableCell>{displayValue(student.motherName)}</TableCell>
            <TableCell>{displayValue(student.gender)}</TableCell>
            <TableCell>{displayValue(formatDate(student.birthDate))}</TableCell>
            <TableCell>{displayValue(student.biNumber)}</TableCell>
            <TableCell>{displayValue(formatDate(student.issueDate))}</TableCell>
            <TableCell>{displayValue(formatDate(student.expiryDate))}</TableCell>
            <TableCell>{displayValue(student.nuit)}</TableCell>
            <TableCell>{displayValue(student.country)}</TableCell>
            <TableCell>{displayValue(joinLocation(student.birthDistrict, student.birthProvince))}</TableCell>
            <TableCell>{displayValue(student.addressProvince)}</TableCell>
            <TableCell>{displayValue(student.addressDistrict)}</TableCell>
            <TableCell>{displayValue(student.address)}</TableCell>
            <TableCell>{displayValue(student.phone)}</TableCell>
            <TableCell>{displayValue(student.email)}</TableCell>
            <TableCell>{displayValue(student.courseName)}</TableCell>
            <TableCell>{displayValue(student.categoryName)}</TableCell>
            <TableCell>{displayValue(student.levelName)}</TableCell>
            <TableCell>{displayValue(student.modalityName)}</TableCell>
            <TableCell>{displayValue(formatDuration(student.durationMonths))}</TableCell>
            <TableCell>{formatEnrollmentDate(student.enrollmentDate)}</TableCell>
            <TableCell><Money value={student.monthlyFeeAmount} /></TableCell>
            <TableCell>{displayValue(student.monthlyFeeType)}</TableCell>
            <TableCell><Money value={student.enrollmentFeeAmount} /></TableCell>
            <TableCell>{displayValue(student.enrollmentFeeType)}</TableCell>
            <TableCell>{displayValue(student.manualFeeType)}</TableCell>
            <TableCell><Money value={student.manualFeeAmount} /></TableCell>
            <TableCell align="right">
              <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                <Tooltip title="Ver dados do estudante">
                  <IconButton
                    aria-label={`Ver dados de ${student.studentCode}`}
                    onClick={() => {
                      setDetailsTab(0);
                      setSelectedStudent(student);
                    }}
                  >
                    <Eye size={17} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Editar estudante">
                  <IconButton
                    aria-label={`Editar ${student.studentCode}`}
                    onClick={() => onEdit(student)}
                  >
                    <Pencil size={17} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={student.active ? 'Desativar estudante' : 'Ativar estudante'}>
                  <span>
                    <IconButton
                      className={student.active
                        ? 'cacoin-table-action-deactivate'
                        : 'cacoin-table-action-activate'}
                      aria-label={`${student.active ? 'Desativar' : 'Ativar'} ${student.studentCode}`}
                      onClick={() => toggleStudentStatus(student)}
                      disabled={updatingStatusId === student.id}
                    >
                      <Power size={17} />
                    </IconButton>
                  </span>
                </Tooltip>
                {student.canDelete && (
                  <Tooltip title="Apagar estudante">
                    <IconButton
                      className="cacoin-table-action-delete"
                      aria-label={`Apagar ${student.studentCode}`}
                      color="error"
                      onClick={() => setStudentToDelete(student)}
                    >
                      <Trash2 size={17} />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog
        open={Boolean(selectedStudent)}
        onClose={() => setSelectedStudent(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Dados do estudante — {selectedStudent?.studentCode}
        </DialogTitle>
        <DialogContent>
          <Tabs
            value={detailsTab}
            onChange={(_, value) => setDetailsTab(value)}
            aria-label="Separadores dos dados do estudante"
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Dados Pessoais" />
            <Tab label="Endereço" />
            <Tab label="Detalhes do Curso" />
          </Tabs>
          <DetailList
            rows={[personalDetailFields, addressDetailFields, courseDetailFields][detailsTab]
              .map(([label, getValue]) => [label, displayValue(getValue(selectedStudent ?? {}))])}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedStudent(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(studentToDelete)}
        onClose={() => !deleting && setStudentToDelete(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Apagar estudante</DialogTitle>
        <DialogContent>
          Tem a certeza de que pretende apagar {studentToDelete?.studentCode}? As inscrições
          associadas também serão apagadas.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStudentToDelete(null)} disabled={deleting}>
            Cancelar
          </Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={deleting}>
            {deleting ? 'A apagar…' : 'Apagar'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
