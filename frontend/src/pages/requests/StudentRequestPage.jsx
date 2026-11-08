import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { Ban, CheckCheck, CircleCheck, History } from 'lucide-react';
import DataExportMenu from '../../components/DataExportMenu';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import StatusBadge from '../../components/StatusBadge';
import {
  approveStudentRequest,
  completeStudentRequest,
  createStudentRequest,
  getStudentRequestAttachmentUrl,
  getStudentRequestTypes,
  getStudentRequests,
  getStudents,
  rejectStudentRequest,
} from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { filterBySearch } from '../../utils/search';
import RequestFilters from './RequestFilters';
import { applyFilters, emptyFilters, errorMessage, requestStatusCodes } from './requestUtils';

const baseColumns = [
  { key: 'requestNumber', label: 'N.º de Pedido' },
  { key: 'studentCode', label: 'Código do Estudante' },
  { key: 'studentName', label: 'Nome' },
  { key: 'courseName', label: 'Curso' },
  { key: 'categoryName', label: 'Categoria' },
  { key: 'levelName', label: 'Nível' },
  { key: 'modalityName', label: 'Modalidade' },
  { key: 'typeName', label: 'Tipo de Pedido' },
  { key: 'description', label: 'Descrição' },
  { key: 'attachments', label: 'Anexos' },
  { key: 'requestDate', label: 'Data de Pedido' },
  { key: 'statusLabel', label: 'Estado' },
];
const notesColumn = { key: 'notes', label: 'Notas' };
const actionsColumn = { key: 'actions', label: 'Acções', align: 'right' };
const modes = {
  new: { title: 'Novo Pedido' },
  pending: {
    title: 'Pendentes',
    status: requestStatusCodes.pending,
    columns: baseColumns,
    empty: 'Ainda não existem pedidos pendentes.',
    filename: 'pedidos-pendentes',
    ariaLabel: 'Pedidos pendentes',
  },
  list: {
    title: 'Pedidos',
    columns: baseColumns,
    empty: 'Ainda não existem pedidos registados.',
    filename: 'pedidos',
    ariaLabel: 'Pedidos',
  },
  rejected: {
    title: 'Rejeitados',
    status: requestStatusCodes.rejected,
    columns: [...baseColumns, notesColumn],
    empty: 'Ainda não existem pedidos rejeitados.',
    filename: 'pedidos-rejeitados',
    ariaLabel: 'Pedidos rejeitados',
  },
};
const historyColumns = [...baseColumns, notesColumn];
const attachmentNames = (row) => row.attachments.map((item) => item.fileName).join(' | ');

const requestCells = (row, withNotes) => (
  <>
    <TableCell>{row.requestNumber}</TableCell>
    <TableCell>{row.studentCode}</TableCell>
    <TableCell>{displayText(row.studentName)}</TableCell>
    <TableCell>{displayText(row.courseName)}</TableCell>
    <TableCell>{displayText(row.categoryName)}</TableCell>
    <TableCell>{displayText(row.levelName)}</TableCell>
    <TableCell>{displayText(row.modalityName)}</TableCell>
    <TableCell>{displayText(row.typeName)}</TableCell>
    <TableCell>{row.description}</TableCell>
    <TableCell>
      {row.attachments.length ? row.attachments.map((item) => (
        <div key={item.id}>
          <a href={getStudentRequestAttachmentUrl(item.id)} target="_blank" rel="noreferrer">
            {item.fileName}
          </a>
        </div>
      )) : '—'}
    </TableCell>
    <TableCell>{toDisplayDate(row.requestDate)}</TableCell>
    <TableCell><StatusBadge label={row.statusLabel} tone={row.statusTone} /></TableCell>
    {withNotes && <TableCell>{displayText(row.notes)}</TableCell>}
  </>
);

export default function StudentRequestPage({ mode }) {
  const page = modes[mode] ?? modes.list;
  const [students, setStudents] = useState([]);
  const [types, setTypes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [student, setStudent] = useState(null);
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [formKey, setFormKey] = useState(0);
  const [filters, setFilters] = useState(emptyFilters);
  const [searchTerm, setSearchTerm] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [notes, setNotes] = useState('');
  const [historyStudent, setHistoryStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'new') {
        const [loadedStudents, loadedTypes, loadedRequests] = await Promise.all([
          getStudents(),
          getStudentRequestTypes(),
          getStudentRequests(),
        ]);
        setStudents(loadedStudents.filter((item) => item.active && item.courseId));
        setTypes(loadedTypes);
        setRequests(loadedRequests);
      } else {
        setRequests(await getStudentRequests());
      }
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action, message) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(message);
      await load();
      return true;
    } catch (actionError) {
      setError(errorMessage(actionError));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!student || !type) {
      setError('Seleccione o estudante e o tipo de pedido.');
      return;
    }
    const formData = new FormData();
    formData.append('request', new Blob([JSON.stringify({
      studentId: student.id,
      courseId: student.courseId,
      typeId: type,
      description,
    })], { type: 'application/json' }));
    files.forEach((file) => formData.append('files', file));
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const created = await createStudentRequest(formData);
      setNotice(`Pedido ${created.requestNumber} registado.`);
      setStudent(null);
      setType('');
      setDescription('');
      setFiles([]);
      setFormKey((current) => current + 1);
      await load();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const confirmRejection = async (event) => {
    event.preventDefault();
    const rejected = await run(
      () => rejectStudentRequest(rejecting.id, notes),
      `Pedido ${rejecting.requestNumber} rejeitado.`,
    );
    if (rejected) {
      setRejecting(null);
      setNotes('');
    }
  };

  const modeRows = useMemo(
    () => (page.status ? requests.filter((item) => item.status === page.status) : requests),
    [requests, page.status],
  );
  const visibleRows = useMemo(() => filterBySearch(
    applyFilters(modeRows, filters),
    searchTerm,
    (item) => [
      item.requestNumber,
      item.studentCode,
      item.studentName,
      item.courseName,
      item.categoryName,
      item.levelName,
      item.modalityName,
      item.typeName,
      item.description,
      item.statusLabel,
      item.notes,
      attachmentNames(item),
    ],
  ), [modeRows, filters, searchTerm]);
  const exportColumns = page.columns?.filter(({ key }) => key !== 'actions') ?? [];
  const exportRows = visibleRows.map((item) => ({
    requestNumber: item.requestNumber,
    studentCode: item.studentCode,
    studentName: displayText(item.studentName),
    courseName: displayText(item.courseName),
    categoryName: displayText(item.categoryName),
    levelName: displayText(item.levelName),
    modalityName: displayText(item.modalityName),
    typeName: displayText(item.typeName),
    description: item.description,
    attachments: attachmentNames(item) || '—',
    requestDate: toDisplayDate(item.requestDate),
    statusLabel: item.statusLabel,
    notes: displayText(item.notes),
  }));
  const studentHistory = (studentId) => requests.filter((item) => item.studentId === studentId);

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>{page.title}</h1>
        </div>
        {mode !== 'new' && (
          <div className="cacoin-page-heading-actions">
            <SearchField value={searchTerm} onChange={setSearchTerm} />
            <DataExportMenu
              columns={exportColumns}
              rows={exportRows}
              filename={page.filename}
              title={page.title}
              disabled={loading}
              onError={(exportError) => setError(errorMessage(exportError))}
            />
          </div>
        )}
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {mode === 'new' ? (
        <>
          {!loading && (!students.length || !types.length) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {!students.length && 'Não existem estudantes activos inscritos num curso. '}
              {!types.length && 'Defina os tipos de pedidos em Configurações > Pedidos > Tipos de Pedidos.'}
            </Alert>
          )}
          <form className="cacoin-test-registration-form" onSubmit={submit}>
            <Autocomplete
              key={formKey}
              options={students}
              value={student}
              onChange={(_, selected) => setStudent(selected)}
              getOptionLabel={(option) => option.studentCode ?? ''}
              isOptionEqualToValue={(option, selected) => option.id === selected.id}
              disabled={loading || saving}
              renderInput={(params) => (
                <TextField {...params} required label="Código do Estudante" size="small" />
              )}
            />
            <TextField
              size="small"
              label="Nome"
              value={student ? displayText([student.firstName, student.surname].filter(Boolean).join(' ')) : ''}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              size="small"
              label="Curso"
              value={student ? displayText(student.courseName) : ''}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              size="small"
              label="Categoria"
              value={student ? displayText(student.categoryName) : ''}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              size="small"
              label="Nível"
              value={student ? displayText(student.levelName) : ''}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              size="small"
              label="Modalidade"
              value={student ? displayText(student.modalityName) : ''}
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              required
              select
              size="small"
              label="Tipo de Pedido"
              value={type}
              onChange={(event) => setType(event.target.value)}
              disabled={loading || saving}
              sx={{ gridColumn: '1 / -1' }}
            >
              {types.map((item) => (
                <MenuItem key={item.id} value={item.id}>{displayText(item.name)}</MenuItem>
              ))}
            </TextField>
            <TextField
              required
              multiline
              minRows={3}
              size="small"
              label="Descrição"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={loading || saving}
              sx={{ gridColumn: '1 / -1' }}
            />
            <TextField
              key={`files-${formKey}`}
              size="small"
              type="file"
              label="Anexos"
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              disabled={loading || saving}
              sx={{ gridColumn: '1 / -1' }}
              slotProps={{
                htmlInput: { accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png', multiple: true },
                inputLabel: { shrink: true },
              }}
            />
            <div className="cacoin-test-registration-actions">
              <Button
                type="submit"
                variant="contained"
                disabled={saving || loading || !students.length || !types.length}
              >
                {saving ? 'A guardar…' : 'Registar pedido'}
              </Button>
            </div>
          </form>
          {student && (
            <div style={{ marginTop: 20 }}>
              <StandardTable
                audit="StudentRequest"
                ariaLabel="Pedidos do estudante"
                columns={historyColumns}
                emptyMessage="O estudante ainda não fez pedidos."
                rows={studentHistory(student.id)}
                renderRow={(row, rowNumber) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{rowNumber}</TableCell>
                    {requestCells(row, true)}
                  </TableRow>
                )}
              />
            </div>
          )}
        </>
      ) : (
        <>
          <RequestFilters rows={modeRows} filters={filters} onChange={setFilters} />
          <StandardTable
            audit="StudentRequest"
            ariaLabel={page.ariaLabel}
            columns={[...page.columns, actionsColumn]}
            emptyMessage={error
              ? 'Não foi possível carregar os dados.'
              : searchTerm.trim() || Object.values(filters).some(Boolean)
                ? 'Nenhum registo corresponde à pesquisa.'
                : page.empty}
            loading={loading}
            rows={visibleRows}
            renderRow={(row, rowNumber) => (
              <TableRow key={row.id} hover>
                <TableCell>{rowNumber}</TableCell>
                {requestCells(row, page.columns.includes(notesColumn))}
                <TableCell align="right">
                  <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                    {row.status === requestStatusCodes.pending && (
                      <>
                        <Tooltip title="Aprovar">
                          <span>
                            <IconButton
                              className="cacoin-table-action-activate"
                              aria-label={`Aprovar pedido ${row.requestNumber}`}
                              disabled={saving}
                              onClick={() => run(
                                () => approveStudentRequest(row.id),
                                `Pedido ${row.requestNumber} aprovado.`,
                              )}
                            >
                              <CircleCheck size={17} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Rejeitar">
                          <span>
                            <IconButton
                              className="cacoin-table-action-delete"
                              aria-label={`Rejeitar pedido ${row.requestNumber}`}
                              disabled={saving}
                              onClick={() => {
                                setError('');
                                setNotes('');
                                setRejecting(row);
                              }}
                            >
                              <Ban size={17} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    )}
                    {row.status === requestStatusCodes.approved && (
                      <Tooltip title="Concluir">
                        <span>
                          <IconButton
                            className="cacoin-table-action-activate"
                            aria-label={`Concluir pedido ${row.requestNumber}`}
                            disabled={saving}
                            onClick={() => run(
                              () => completeStudentRequest(row.id),
                              `Pedido ${row.requestNumber} concluído.`,
                            )}
                          >
                            <CheckCheck size={17} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    <Tooltip title="Pedidos do estudante">
                      <span>
                        <IconButton
                          aria-label={`Ver pedidos de ${row.studentCode}`}
                          onClick={() => setHistoryStudent(row)}
                        >
                          <History size={17} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
          />
        </>
      )}

      <Dialog
        open={Boolean(rejecting)}
        onClose={() => !saving && setRejecting(null)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={confirmRejection}>
          <DialogTitle>Rejeitar pedido — {rejecting?.requestNumber}</DialogTitle>
          <DialogContent>
            <TextField
              required
              autoFocus
              multiline
              minRows={3}
              fullWidth
              size="small"
              label="Notas"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRejecting(null)} disabled={saving}>Cancelar</Button>
            <Button type="submit" color="error" variant="contained" disabled={saving}>
              {saving ? 'A rejeitar…' : 'Rejeitar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(historyStudent)}
        onClose={() => setHistoryStudent(null)}
        fullWidth
        maxWidth="xl"
      >
        <DialogTitle>
          Pedidos — {historyStudent?.studentCode} {displayText(historyStudent?.studentName)}
        </DialogTitle>
        <DialogContent>
          {historyStudent && (
            <StandardTable
              audit="StudentRequest"
              ariaLabel="Pedidos do estudante"
              columns={historyColumns}
              emptyMessage="O estudante ainda não fez pedidos."
              rows={studentHistory(historyStudent.studentId)}
              renderRow={(row, rowNumber) => (
                <TableRow key={row.id} hover>
                  <TableCell>{rowNumber}</TableCell>
                  {requestCells(row, true)}
                </TableRow>
              )}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryStudent(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
