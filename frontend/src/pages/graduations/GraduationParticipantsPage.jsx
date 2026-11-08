import { useEffect, useMemo, useState } from 'react';
import { Alert, TableCell, TableRow } from '@mui/material';
import DataExportMenu from '../../components/DataExportMenu';
import Money from '../../components/Money';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import { getGraduationRegistrations } from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { formatMoney as money } from '../../utils/money';
import { filterBySearch } from '../../utils/search';
import {
  errorMessage,
  formatDuration,
  graduationStatusClass,
  graduationStatusLabels,
} from './graduationUtils';

const columns = [
  { key: 'studentCode', label: 'Código do Estudante' },
  { key: 'studentName', label: 'Nome' },
  { key: 'courseName', label: 'Curso' },
  { key: 'categoryName', label: 'Categoria' },
  { key: 'levelName', label: 'Nível' },
  { key: 'modalityName', label: 'Modalidade' },
  { key: 'duration', label: 'Duração' },
  { key: 'amount', label: 'Taxa de Graduação' },
  { key: 'registrationDate', label: 'Data de Inscrição' },
  { key: 'status', label: 'Estado' },
];

export default function GraduationParticipantsPage() {
  const [registrations, setRegistrations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getGraduationRegistrations()
      .then((loaded) => {
        if (mounted) setRegistrations(loaded.filter((item) => item.paid));
      })
      .catch((loadError) => {
        if (mounted) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const rows = useMemo(() => filterBySearch(registrations, searchTerm, (item) => [
    item.studentCode,
    item.studentName,
    item.courseName,
    item.categoryName,
    item.levelName,
    item.modalityName,
    graduationStatusLabels[item.status],
  ]), [registrations, searchTerm]);
  const exportRows = rows.map((item) => ({
    studentCode: item.studentCode,
    studentName: displayText(item.studentName),
    courseName: displayText(item.courseName),
    categoryName: displayText(item.categoryName),
    levelName: displayText(item.levelName),
    modalityName: displayText(item.modalityName),
    duration: formatDuration(item.durationMonths) || '—',
    amount: money(item.amount),
    registrationDate: toDisplayDate(item.registrationDate),
    status: graduationStatusLabels[item.status],
  }));

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>Graduação</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={columns}
            rows={exportRows}
            filename="graduacao-participantes"
            title="Participantes da graduação"
            disabled={loading}
            onError={(exportError) => setError(errorMessage(exportError))}
          />
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <StandardTable
        audit="GraduationRegistration"
        ariaLabel="Participantes da graduação"
        columns={columns}
        emptyMessage={error
          ? 'Não foi possível carregar os dados.'
          : searchTerm.trim()
            ? 'Nenhum registo corresponde à pesquisa.'
            : 'Ainda não existem participantes na graduação.'}
        loading={loading}
        rows={rows}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.id} hover>
            <TableCell>{rowNumber}</TableCell>
            <TableCell>{row.studentCode}</TableCell>
            <TableCell>{displayText(row.studentName)}</TableCell>
            <TableCell>{displayText(row.courseName)}</TableCell>
            <TableCell>{displayText(row.categoryName)}</TableCell>
            <TableCell>{displayText(row.levelName)}</TableCell>
            <TableCell>{displayText(row.modalityName)}</TableCell>
            <TableCell>{formatDuration(row.durationMonths) || '—'}</TableCell>
            <TableCell><Money value={row.amount} /></TableCell>
            <TableCell>{toDisplayDate(row.registrationDate)}</TableCell>
            <TableCell>
              <span className={`cacoin-status-badge ${graduationStatusClass(row.status)}`}>
                {graduationStatusLabels[row.status]}
              </span>
            </TableCell>
          </TableRow>
        )}
      />
    </section>
  );
}
