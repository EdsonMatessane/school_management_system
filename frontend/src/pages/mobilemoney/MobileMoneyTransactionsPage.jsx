import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, IconButton, TableCell, TableRow, Tooltip } from '@mui/material';
import { RefreshCw } from 'lucide-react';
import DataExportMenu from '../../components/DataExportMenu';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import StatusBadge from '../../components/StatusBadge';
import { getMobileMoneyTransactions, refreshMobileMoneyTransaction } from '../../services/api';
import { displayText } from '../../utils/displayText';
import { formatMoney } from '../../utils/money';
import { filterBySearch } from '../../utils/search';
import { errorMessage, formatDateTime } from '../users/userUtils';

const baseColumns = [
  { key: 'reference', label: 'Referência' },
  { key: 'studentCode', label: 'Código do Estudante' },
  { key: 'studentName', label: 'Nome' },
  { key: 'courseName', label: 'Curso' },
  { key: 'categoryName', label: 'Categoria' },
  { key: 'levelName', label: 'Nível' },
  { key: 'modalityName', label: 'Modalidade' },
  { key: 'kindLabel', label: 'Tipo' },
  { key: 'description', label: 'Descrição' },
  { key: 'walletLabel', label: 'Carteira' },
  { key: 'phone', label: 'Número' },
  { key: 'destinationNumber', label: 'Carteira da Instituição' },
  { key: 'amount', label: 'Valor' },
  { key: 'createdAt', label: 'Data & Hora' },
  { key: 'statusLabel', label: 'Estado' },
];
const modes = {
  pending: {
    title: 'Pendentes',
    status: 'PENDING',
    columns: baseColumns,
    empty: 'Não existem pagamentos a aguardar confirmação.',
    filename: 'mobile-money-pendentes',
  },
  done: {
    title: 'Efectuados',
    status: 'SUCCESS',
    columns: [...baseColumns, { key: 'registered', label: 'Registo' }],
    empty: 'Ainda não existem pagamentos efectuados.',
    filename: 'mobile-money-efectuados',
  },
  failed: {
    title: 'Falhados',
    status: 'FAILED',
    columns: [...baseColumns, { key: 'failureReason', label: 'Motivo' }],
    empty: 'Ainda não existem pagamentos falhados.',
    filename: 'mobile-money-falhados',
  },
};
const actionsColumn = { key: 'actions', label: 'Acções', align: 'right' };

const cell = (row, key) => {
  if (key === 'statusLabel') return <StatusBadge label={row.statusLabel} tone={row.statusTone} />;
  if (key === 'amount') return formatMoney(row.amount);
  if (key === 'createdAt') return formatDateTime(row.createdAt);
  if (key === 'registered') return row.recorded ? 'Registado' : (row.failureReason ?? 'Por registar');
  return displayText(row[key]);
};

export default function MobileMoneyTransactionsPage({ mode }) {
  const page = modes[mode] ?? modes.done;
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setTransactions(await getMobileMoneyTransactions());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const check = async (row) => {
    setBusy(true);
    setError('');
    try {
      await refreshMobileMoneyTransaction(row.id);
      await load();
    } catch (checkError) {
      setError(errorMessage(checkError));
    } finally {
      setBusy(false);
    }
  };

  const rows = useMemo(() => filterBySearch(
    transactions.filter((item) => item.status === page.status),
    searchTerm,
    (item) => [item.reference, item.studentCode, item.studentName, item.phone, item.description],
  ), [transactions, page.status, searchTerm]);
  const exportRows = rows.map((item) => Object.fromEntries(page.columns.map(({ key }) => [
    key,
    key === 'statusLabel' ? item.statusLabel : cell(item, key),
  ])));

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Mobile Money</p>
          <h1>{page.title}</h1>
        </div>
        <div className="cacoin-page-heading-actions">
          <SearchField value={searchTerm} onChange={setSearchTerm} />
          <DataExportMenu
            columns={page.columns}
            rows={exportRows}
            filename={page.filename}
            title={`Mobile Money — ${page.title}`}
            disabled={loading}
            onError={(exportError) => setError(errorMessage(exportError))}
          />
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <StandardTable
        audit="MobileMoneyTransaction"
        ariaLabel={`Mobile Money — ${page.title}`}
        columns={mode === 'pending' ? [...page.columns, actionsColumn] : page.columns}
        emptyMessage={error
          ? 'Não foi possível carregar os dados.'
          : searchTerm.trim() ? 'Nenhum registo corresponde à pesquisa.' : page.empty}
        loading={loading}
        rows={rows}
        renderRow={(row, rowNumber) => (
          <TableRow key={row.id} hover>
            <TableCell>{rowNumber}</TableCell>
            {page.columns.map(({ key }) => <TableCell key={key}>{cell(row, key)}</TableCell>)}
            {mode === 'pending' && (
              <TableCell align="right">
                <Tooltip title="Verificar">
                  <span>
                    <IconButton aria-label={`Verificar ${row.reference}`} disabled={busy} onClick={() => check(row)}>
                      <RefreshCw size={17} />
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
            )}
          </TableRow>
        )}
      />
    </section>
  );
}
