import { useCallback, useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Button,
  TableCell,
  TableRow,
  TextField,
} from '@mui/material';
import { ChevronDown } from 'lucide-react';
import StandardTable from '../../components/StandardTable';
import StatusBadge from '../../components/StatusBadge';
import { getMobileMoneyPayables, getStudents } from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { formatMoney } from '../../utils/money';
import { errorMessage } from '../users/userUtils';
import MobileMoneyPaymentDialog from './MobileMoneyPaymentDialog';

const columns = [
  { key: 'description', label: 'Descrição' },
  { key: 'detail', label: 'Detalhe' },
  { key: 'date', label: 'Data' },
  { key: 'amount', label: 'Valor' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: 'Acções', align: 'right' },
];

export default function MobileMoneyPayPage() {
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [searched, setSearched] = useState('');
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (value) => {
    setLoading(true);
    setError('');
    try {
      setData(await getMobileMoneyPayables(value));
      setSearched(value);
    } catch (loadError) {
      setData(null);
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getStudents()
      .then(setStudents)
      .catch((loadError) => setError(errorMessage(loadError)));
  }, []);

  const choose = (student) => {
    setSelected(student);
    setExpanded(false);
    if (student) {
      load(student.studentCode);
    } else {
      setData(null);
      setSearched('');
    }
  };

  const reload = useCallback(() => {
    if (searched) load(searched);
  }, [load, searched]);

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Mobile Money</p>
          <h1>Novo Pagamento</h1>
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <div
        className="cacoin-test-registration-form"
        style={{ marginBottom: 20, gridTemplateColumns: 'minmax(0, 1fr)' }}
      >
        <Autocomplete
          options={students}
          value={selected}
          onChange={(_, student) => choose(student)}
          getOptionLabel={(option) => `${option.studentCode} — ${displayText([option.firstName, option.surname].filter(Boolean).join(' '))}`}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          disabled={loading}
          noOptionsText="Nenhum estudante encontrado"
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              <strong style={{ marginRight: 8 }}>{option.studentCode}</strong>
              {displayText([option.firstName, option.surname].filter(Boolean).join(' '))}
            </li>
          )}
          renderInput={(params) => (
            <TextField {...params} size="small" label="Código ou Nome do Estudante" />
          )}
        />
      </div>

      {data && (
        <>
          <section className="cacoin-task-dashboard-panel" style={{ marginBottom: 20 }}>
            <header>
              <div>
                <h2>{data.studentCode} — {displayText(data.studentName)}</h2>
              </div>
            </header>
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px 24px', margin: 0 }}>
              {[
                ['Curso', data.courseName],
                ['Categoria', data.categoryName],
                ['Nível', data.levelName],
                ['Modalidade', data.modalityName],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt style={{ fontSize: 12, opacity: 0.7 }}>{label}</dt>
                  <dd style={{ margin: 0, fontWeight: 600 }}>{displayText(value)}</dd>
                </div>
              ))}
            </dl>
          </section>

          {data.groups.map((group) => (
            <Accordion
              key={group.kind}
              expanded={expanded === group.kind}
              onChange={(_, open) => setExpanded(open ? group.kind : false)}
              disableGutters
            >
              <AccordionSummary expandIcon={<ChevronDown size={18} />}>
                <span style={{ fontWeight: 650, flex: 1 }}>{group.label}</span>
                <span style={{ marginRight: 12 }}>
                  {group.items.length} pendente(s) · {formatMoney(group.total)}
                </span>
              </AccordionSummary>
              <AccordionDetails>
                <StandardTable
                  ariaLabel={group.label}
                  columns={columns}
                  emptyMessage="Não existem pagamentos pendentes."
                  rows={group.items}
                  renderRow={(row, rowNumber) => (
                    <TableRow key={row.itemId} hover>
                      <TableCell>{rowNumber}</TableCell>
                      <TableCell>{displayText(row.description)}</TableCell>
                      <TableCell>{displayText(row.detail)}</TableCell>
                      <TableCell>{toDisplayDate(row.date)}</TableCell>
                      <TableCell>{formatMoney(row.amount)}</TableCell>
                      <TableCell>
                        <StatusBadge
                          label={row.awaitingPayment ? 'A aguardar PIN' : 'Por pagar'}
                          tone={row.awaitingPayment ? 'pending' : 'rejected'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="contained"
                          disabled={row.awaitingPayment}
                          onClick={() => setTarget({ student: data, kind: group.kind, item: row })}
                        >
                          Pagar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                />
              </AccordionDetails>
            </Accordion>
          ))}
        </>
      )}

      <MobileMoneyPaymentDialog
        target={target}
        onClose={() => {
          setTarget(null);
          reload();
        }}
        onDone={reload}
      />
    </section>
  );
}
