import { isTeacherMode } from '../../utils/teacherMode';
import { ownDetails, withoutPersonal } from './ownReport';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TableCell,
  TableRow,
  Tooltip,
} from '@mui/material';
import { Eye } from 'lucide-react';
import DataExportMenu from '../../components/DataExportMenu';
import Money from '../../components/Money';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import { getSalaryDebts } from '../../services/api';
import { displayText } from '../../utils/displayText';
import { formatMoney as money } from '../../utils/money';
import { filterBySearch } from '../../utils/search';
import { errorMessage, monthLabel } from './financeUtils';

const columns = [
  { key: 'staffCode', label: 'Código do Funcionário' },
  { key: 'staffName', label: 'Nome' },
  { key: 'phone', label: 'Telefone' },
  { key: 'biNumber', label: 'BI' },
  { key: 'nuit', label: 'NUIT' },
  { key: 'positionName', label: 'Cargo' },
  { key: 'salaryTypeName', label: 'Tipo de Salário' },
  { key: 'salary', label: 'Salário' },
  { key: 'totalOwed', label: 'Total em Dívida' },
  { key: 'actions', label: 'Acções', align: 'right' },
];
const allExportColumns = columns.filter(({ key }) => key !== 'actions');

export default function SalaryDebtsPage() {
  const own = isTeacherMode();
  const tableColumns = own ? withoutPersonal(columns) : columns;
  const exportColumns = own ? withoutPersonal(allExportColumns) : allExportColumns;
  const [rows, setRows] = useState([]);
  const [details, setDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getSalaryDebts()
      .then((loaded) => {
        if (mounted) setRows(loaded);
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

  const visible = useMemo(() => filterBySearch(rows, searchTerm, (item) => [
    item.staffCode, item.staffName, item.phone, item.biNumber, item.nuit,
    item.positionName, item.salaryTypeName,
  ]), [rows, searchTerm]);
  const exportRows = visible.map((item) => ({
    staffCode: item.staffCode,
    staffName: displayText(item.staffName),
    phone: displayText(item.phone),
    biNumber: displayText(item.biNumber),
    nuit: displayText(item.nuit),
    positionName: displayText(item.positionName),
    salaryTypeName: displayText(item.salaryTypeName),
    salary: money(item.salary),
    totalOwed: money(item.totalOwed),
  }));

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Finanças</p>
          <h1>Em dívidas</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          {!isTeacherMode() && <SearchField value={searchTerm} onChange={setSearchTerm} />}
          <DataExportMenu
            columns={exportColumns}
            rows={exportRows}
            details={own ? ownDetails(visible[0]) : undefined}
            filename="salarios-em-divida"
            title={own ? 'Salários em dívida' : 'Funcionários com salários em dívida'}
            disabled={loading}
            onError={(exportError) => setError(errorMessage(exportError))}
          />
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <StandardTable
        ariaLabel="Funcionários em dívida"
        columns={tableColumns}
        emptyMessage={error
          ? 'Não foi possível carregar os dados.'
          : searchTerm.trim()
            ? 'Nenhum registo corresponde à pesquisa.'
            : 'Não existem funcionários com salários em dívida.'}
        loading={loading}
        rows={visible}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.staffId} hover>
            <TableCell>{rowNumber}</TableCell>
            {!own && (
              <>
                <TableCell>{row.staffCode}</TableCell>
                <TableCell>{displayText(row.staffName)}</TableCell>
                <TableCell>{displayText(row.phone)}</TableCell>
                <TableCell>{displayText(row.biNumber)}</TableCell>
                <TableCell>{displayText(row.nuit)}</TableCell>
                <TableCell>{displayText(row.positionName)}</TableCell>
                <TableCell>{displayText(row.salaryTypeName)}</TableCell>
              </>
            )}
            <TableCell><Money value={row.salary} /></TableCell>
            <TableCell><Money value={row.totalOwed} /></TableCell>
            <TableCell align="right">
              <Tooltip title="Ver detalhes">
                <IconButton
                  aria-label={`Ver meses em dívida de ${row.staffCode}`}
                  onClick={() => setDetails(row)}
                >
                  <Eye size={17} />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        )}
      />

      <Dialog open={Boolean(details)} onClose={() => setDetails(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          Meses por pagar — {details?.staffCode} {displayText(details?.staffName)}
        </DialogTitle>
        <DialogContent>
          <StandardTable
            ariaLabel="Meses em dívida"
            columns={[
              { key: 'month', label: 'Mês' },
              { key: 'owed', label: 'Valor em dívida' },
              { key: 'type', label: 'Situação' },
            ]}
            emptyMessage="Sem meses em dívida."
            loading={false}
            rows={details?.months ?? []}
            renderRow={(row, rowNumber) => (
              <TableRow key={row.month} hover>
                <TableCell>{rowNumber}</TableCell>
                <TableCell>{monthLabel(row.month)}</TableCell>
                <TableCell><Money value={row.owed} /></TableCell>
                <TableCell>{row.partial ? 'Pago parcialmente' : 'Não pago'}</TableCell>
              </TableRow>
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetails(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
