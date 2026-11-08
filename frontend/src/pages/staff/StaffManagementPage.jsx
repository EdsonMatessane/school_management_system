import DetailList from '../../components/DetailList';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Power, Trash2, BriefcaseBusiness } from 'lucide-react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TableCell,
  TableRow,
  Tooltip,
  Tab,
  Tabs,
} from '@mui/material';
import DataExportMenu from '../../components/DataExportMenu';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import {
  deleteStaff,
  getStaff,
  getStaffDocumentUrl,
  setStaffActive,
} from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { filterBySearch } from '../../utils/search';

const staffLabels = {
  hr: 'Recursos Humanos',
  teachers: 'Professores',
  other: 'Outros Funcionários',
};

const exportColumns = [
  { key: 'staffCode', label: 'Código do Funcionário' },
  { key: 'name', label: 'Nome' },
  { key: 'position', label: 'Cargo' },
  { key: 'gender', label: 'Género' },
  { key: 'phone', label: 'Telefone' },
  { key: 'email', label: 'Email' },
  { key: 'trainingCourse', label: 'Curso de Formação' },
  { key: 'institution', label: 'Instituição' },
  { key: 'entryYear', label: 'Ano de Ingresso' },
  { key: 'completionYear', label: 'Ano de Término' },
];

const personalDetails = [
  ['Código do Funcionário', (member) => member.staffCode],
  ['Nome', (member) => [member.firstName, member.surname].filter(Boolean).join(' ')],
  ['Nome do Pai', (member) => member.fatherName],
  ['Nome da Mãe', (member) => member.motherName],
  ['Género', (member) => member.gender],
  ['Data de Nascimento', (member) => (member.birthDate ? toDisplayDate(member.birthDate) : '')],
  ['Cargo', (member) => member.positionName],
  ['Tipo de Documento', (member) => member.documentTypeName],
  ['Número do Documento', (member) => member.biNumber],
  ['NUIT', (member) => member.nuit],
  ['Naturalidade', (member) => [member.birthDistrict, member.birthProvince].filter(Boolean).join(', ')],
];
const addressDetails = [
  ['Província', (member) => member.addressProvince],
  ['Distrito', (member) => member.addressDistrict],
  ['Endereço', (member) => member.address],
  ['Telefone', (member) => member.phone],
  ['Email', (member) => member.email],
];
const trainingDetails = [
  ['Curso de Formação', (member) => member.trainingCourse],
  ['Instituição', (member) => member.institution],
  ['Ano de Ingresso', (member) => member.entryYear],
  ['Ano de Término', (member) => member.completionYear],
  ['Formação em progresso', (member) => member.trainingInProgress ? 'Sim' : 'Não'],
];

const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível carregar os funcionários.';
const displayValue = (value) => value == null || value === '' ? '—' : value;

export default function StaffManagementPage({
  staffType,
  historyMode = false,
  onEdit,
  onEnroll,
  onStatusChanged,
  successMessage,
}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [detailsTab, setDetailsTab] = useState(0);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setMembers(await getStaff(staffType));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [staffType]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const filteredMembers = useMemo(
    () => filterBySearch(
      members.filter((member) => historyMode ? !member.active : member.active),
      searchTerm,
      (member) => Object.values(member).filter((value) => value != null),
    ),
    [members, historyMode, searchTerm],
  );

  const exportRows = useMemo(() => filteredMembers.map((member) => ({
    staffCode: member.staffCode,
    name: [member.firstName, member.surname].filter(Boolean).join(' '),
    position: member.positionName,
    gender: member.gender,
    phone: member.phone,
    email: member.email,
    trainingCourse: member.trainingCourse,
    institution: member.institution,
    entryYear: member.entryYear,
    completionYear: member.completionYear,
  })), [filteredMembers]);

  const toggleStatus = async (member) => {
    const active = !member.active;
    setUpdatingId(member.id);
    setActionError('');
    try {
      await setStaffActive(staffType, member.id, active);
      setMembers((current) => current.map((item) =>
        item.id === member.id ? { ...item, active } : item));
      onStatusChanged(member, active);
    } catch (actionFailure) {
      setActionError(getErrorMessage(actionFailure));
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!memberToDelete) return;
    setDeleting(true);
    setActionError('');
    try {
      await deleteStaff(staffType, memberToDelete.id);
      setMemberToDelete(null);
      await loadMembers();
    } catch (actionFailure) {
      setActionError(getErrorMessage(actionFailure));
    } finally {
      setDeleting(false);
    }
  };

  const title = historyMode ? 'Histórico' : 'Gerir';

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Funcionários</p>
          <h1>{title}</h1>
        </div>
        <Stack
          className="cacoin-page-heading-actions cacoin-staff-heading-actions"
          direction="row"
          spacing={1}
          alignItems="center"
        >
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          {!historyMode && (
            <Button
              variant="contained"
              startIcon={<Plus size={17} />}
              onClick={() => onEnroll(staffType)}
            >
              Inscrever
            </Button>
          )}
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            filename={`funcionarios-${staffType}-${historyMode ? 'historico' : 'ativos'}`}
            title={`${staffLabels[staffType]} — ${title}`}
            onError={(exportError) => setActionError(getErrorMessage(exportError))}
          />
        </Stack>
      </header>
      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError('')}>
          {actionError}
        </Alert>
      )}
      <StandardTable
        audit="StaffMember"
        ariaLabel={`Funcionários de ${staffLabels[staffType]}`}
        columns={[
          { key: 'staffCode', label: 'Código' },
          { key: 'name', label: 'Nome' },
          { key: 'position', label: 'Cargo' },
          { key: 'gender', label: 'Género' },
          { key: 'phone', label: 'Telefone' },
          { key: 'trainingCourse', label: 'Formação' },
          { key: 'institution', label: 'Instituição' },
          { key: 'actions', label: 'Ações', align: 'right' },
        ]}
        emptyMessage={`Não existem funcionários ${historyMode ? 'no histórico' : 'registados'} nesta área.`}
        loading={loading}
        rows={filteredMembers}
        renderRow={(member, rowNumber) => (
          <TableRow key={member.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{member.staffCode}</TableCell>
            <TableCell>
              <span className="cacoin-level-name">
                <BriefcaseBusiness size={17} aria-hidden="true" />
                {displayValue([member.firstName, member.surname].filter(Boolean).join(' '))}
              </span>
            </TableCell>
            <TableCell>{displayValue(member.positionName)}</TableCell>
            <TableCell>{displayValue(member.gender)}</TableCell>
            <TableCell>{displayValue(member.phone)}</TableCell>
            <TableCell>{displayValue(member.trainingCourse)}</TableCell>
            <TableCell>{displayValue(member.institution)}</TableCell>
            <TableCell align="right">
              <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                <Tooltip title="Ver dados do funcionário">
                  <IconButton
                    aria-label={`Ver dados de ${member.staffCode}`}
                    onClick={() => setSelectedMember(member)}
                  >
                    <Eye size={17} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Editar funcionário">
                  <IconButton
                    aria-label={`Editar ${member.staffCode}`}
                    onClick={() => onEdit(member)}
                  >
                    <Pencil size={17} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={member.active ? 'Desativar funcionário' : 'Ativar funcionário'}>
                  <span>
                    <IconButton
                      className={member.active
                        ? 'cacoin-table-action-deactivate'
                        : 'cacoin-table-action-activate'}
                      aria-label={`${member.active ? 'Desativar' : 'Ativar'} ${member.staffCode}`}
                      onClick={() => toggleStatus(member)}
                      disabled={updatingId === member.id}
                    >
                      <Power size={17} />
                    </IconButton>
                  </span>
                </Tooltip>
                {member.canDelete && (
                  <Tooltip title="Apagar funcionário">
                    <IconButton
                      className="cacoin-table-action-delete"
                      aria-label={`Apagar ${member.staffCode}`}
                      color="error"
                      onClick={() => setMemberToDelete(member)}
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
        open={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Dados do funcionário — {selectedMember?.staffCode}</DialogTitle>
        <DialogContent>
          <Tabs
            value={detailsTab}
            onChange={(_, value) => setDetailsTab(value)}
            aria-label="Separadores dos dados do funcionário"
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Dados Pessoais" />
            <Tab label="Endereço e Contactos" />
            <Tab label="Formação" />
          </Tabs>
          <DetailList
            rows={[
              ...[personalDetails, addressDetails, trainingDetails][detailsTab]
                .map(([label, getValue]) => [label, displayValue(getValue(selectedMember ?? {}))]),
              ...(detailsTab === 2 && selectedMember?.certificateFileName ? [[
                'Certificado',
                <a
                  key="certificate"
                  href={getStaffDocumentUrl(staffType, selectedMember.id, 'certificate')}
                  target="_blank"
                  rel="noreferrer"
                >
                  {selectedMember.certificateFileName}
                </a>,
              ]] : []),
              ...(detailsTab === 2 && selectedMember?.cvFileName ? [[
                'CV',
                <a
                  key="cv"
                  href={getStaffDocumentUrl(staffType, selectedMember.id, 'cv')}
                  target="_blank"
                  rel="noreferrer"
                >
                  {selectedMember.cvFileName}
                </a>,
              ]] : []),
            ]}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedMember(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(memberToDelete)}
        onClose={() => !deleting && setMemberToDelete(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Apagar funcionário</DialogTitle>
        <DialogContent>
          Tem a certeza de que pretende apagar {memberToDelete?.staffCode}? Os documentos
          associados também serão removidos.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberToDelete(null)} disabled={deleting}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={deleting}>
            {deleting ? 'A apagar…' : 'Apagar'}
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
