import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  IconButton,
  Menu,
  MenuItem,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { ListChecks, Send } from 'lucide-react';
import DataExportMenu from '../../components/DataExportMenu';
import Money from '../../components/Money';
import SearchField from '../../components/SearchField';
import StandardTable from '../../components/StandardTable';
import RichTextField, { RichTextCell } from '../../components/RichTextField';
import StatusBadge from '../../components/StatusBadge';
import {
  createExpenseRecord,
  getExpenseCatalog,
  getExpenseRecords,
  setExpenseRecordStatus,
} from '../../services/api';
import { toDisplayDate } from '../../utils/date';
import { displayText } from '../../utils/displayText';
import { formatMoney } from '../../utils/money';
import { formatQuantity, quantityUnits } from '../../utils/quantity';
import { richTextIsEmpty, richTextToPlain } from '../../utils/richText';
import { filterBySearch } from '../../utils/search';
import useStatuses from '../../utils/useStatuses';
import { expenseConfigs } from './expenseConfigs';
import ForwardDialog from './ForwardDialog';
import { NotesCell, NotesDialogs } from './RecordNotes';

const errorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.'
);
const parseNumber = (value) => Number(String(value).replace(',', '.'));
const emptyValues = (fields) => Object.fromEntries(
  fields.filter(({ type }) => type !== 'total').flatMap(({ name, type }) => (
    type === 'quantity' ? [[name, ''], ['quantityUnit', '']] : [[name, '']]
  )),
);
const NA = 'N/A';
// Compras e devoluções mostram «N/A» nos valores vazios.
const isTrade = (kind) => kind === 'purchases' || kind === 'returns';
const forwardLabel = (row) => (row.forward
  ? `${row.forward.staffName} — ${row.forward.status === 'DONE' ? 'Concluído' : 'Por fazer'}`
  : '—');
const cellText = (column, row, kind) => {
  const value = row[column.key];
  if (column.type === 'quantity') return formatQuantity(value, row.quantityUnit);
  if (isTrade(kind) && column.type === 'money' && value == null) return NA;
  if (isTrade(kind) && column.type === 'rich' && !richTextToPlain(value)) return NA;
  if (isTrade(kind) && column.type === undefined && !value) return NA;
  if (column.type === 'forward') return forwardLabel(row);
  if (column.type === 'notes') return richTextToPlain(row.notes) || '—';
  if (column.type === 'status') return row.statusLabel;
  if (column.type === 'rich') return richTextToPlain(value) || '—';
  if (column.type === 'money') return formatMoney(value);
  if (column.type === 'date') return value ? toDisplayDate(value) : '—';
  return displayText(value);
};

export default function ExpenseRecordsPage({ kind, mode, view }) {
  const config = expenseConfigs[kind];
  const [values, setValues] = useState(() => emptyValues(config.fields));
  const [formKey, setFormKey] = useState(0);
  const [catalog, setCatalog] = useState([]);
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [menu, setMenu] = useState(null);
  const [forwarding, setForwarding] = useState(null);
  const [editingNotes, setEditingNotes] = useState(null);
  const [viewingNotes, setViewingNotes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { activeStatuses, error: statusError } = useStatuses(config.module);

  const columns = useMemo(() => {
    const base = config.columns.filter((column) => column.type !== 'status');
    const status = config.columns.find((column) => column.type === 'status');
    const withStatus = status
      ? [...base.slice(0, base.findIndex((column) => column.key === 'saleDate') + 1), status,
        ...base.slice(base.findIndex((column) => column.key === 'saleDate') + 1)]
      : [...base, { key: 'statusColumn', label: 'Estado', type: 'status' }];
    return [
      ...withStatus.filter((column) => !(
        column.key === 'rejectionReason' && view === 'pending'
      )),
      { key: 'forward', label: 'Encaminhada', type: 'forward' },
      { key: 'notes', label: 'Anotações', type: 'notes' },
    ];
  }, [config, view]);
  const exportColumns = columns.map(({ key, label }) => ({ key, label }));
  const tableColumns = [...columns, { key: 'actions', label: 'Acções', align: 'right' }];

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'new') {
        setCatalog(config.catalogs ? await getExpenseCatalog() : []);
      } else {
        const loaded = await getExpenseRecords(kind);
        // Devoluções: «Pendente» primeiro; as restantes passam para «Devolvidos».
        setRecords(kind === 'returns' && view
          ? loaded.filter((row) => (view === 'pending') === (row.status === 'PENDING'))
          : loaded);
      }
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [config.catalogs, kind, mode, view]);

  useEffect(() => {
    load();
  }, [load]);

  const quantity = Number(values.quantity);
  const unitPrice = parseNumber(values.unitPrice);
  const total = Number.isInteger(quantity) && quantity > 0 && unitPrice > 0
    ? quantity * unitPrice
    : null;
  const catalogOptions = (catalogKind) => catalog.filter(
    (item) => item.kind === catalogKind && item.active,
  );
  const missingCatalog = config.catalogs
    && !loading
    && config.fields.some(({ type, kind: catalogKind }) => (
      type === 'catalog' && catalogOptions(catalogKind).length === 0
    ));

  const submit = async (event) => {
    event.preventDefault();
    const missingRich = config.fields.find(
      ({ type, required, name }) => type === 'rich' && required && richTextIsEmpty(values[name]),
    );
    if (missingRich) {
      setError(`Indique ${missingRich.label.toLowerCase()}.`);
      return;
    }
    const payload = {};
    config.fields.forEach(({ name, type }) => {
      if (type === 'total') return;
      const value = values[name];
      if (type === 'quantity') {
        payload[name] = value === '' ? null : Number(value);
        payload.quantityUnit = values.quantityUnit;
      } else if (type === 'int') payload[name] = Number(value);
      else if (type === 'money') payload[name] = value === '' ? null : parseNumber(value);
      else if (type === 'catalog') payload[name] = Number(value);
      else payload[name] = value;
    });
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await createExpenseRecord(kind, payload);
      setNotice(config.created);
      setValues(emptyValues(config.fields));
      setFormKey((current) => current + 1);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status) => {
    const row = menu.row;
    setMenu(null);
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await setExpenseRecordStatus(kind, row.id, status);
      setNotice('Estado actualizado.');
      await load();
    } catch (statusChangeError) {
      setError(errorMessage(statusChangeError));
    } finally {
      setSaving(false);
    }
  };

  const visibleRows = useMemo(() => filterBySearch(
    records,
    searchTerm,
    (row) => [...columns.map((column) => cellText(column, row, kind))],
  ), [records, searchTerm, columns]);
  const exportRows = visibleRows.map((row) => Object.fromEntries(
    columns.map((column) => [column.key, cellText(column, row, kind)]),
  ));

  const renderField = (field) => {
    const { name, label, type, required, full, kind: catalogKind } = field;
    const common = {
      key: name,
      size: 'small',
      label,
      sx: full ? { gridColumn: '1 / -1' } : undefined,
    };
    if (type === 'rich') {
      return (
        <RichTextField
          key={name}
          label={label}
          required={required}
          value={values[name]}
          resetKey={formKey}
          onChange={(next) => setValues((current) => ({ ...current, [name]: next }))}
        />
      );
    }
    if (type === 'total') {
      return (
        <TextField
          {...common}
          value={total === null ? (isTrade(kind) ? NA : '') : formatMoney(total)}
          slotProps={{ input: { readOnly: true } }}
        />
      );
    }
    if (type === 'quantity') {
      return (
        <div key={name} style={{ display: 'flex', gap: 8 }}>
          <TextField
            size="small"
            label={label}
            type="number"
            value={values[name]}
            onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))}
            slotProps={{ htmlInput: { min: 1, step: 1 } }}
            sx={{ flex: 1 }}
          />
          <Autocomplete
            freeSolo
            size="small"
            options={quantityUnits}
            value={values.quantityUnit}
            inputValue={values.quantityUnit}
            onInputChange={(_, next) => setValues((current) => ({ ...current, quantityUnit: next }))}
            sx={{ flex: 1 }}
            renderInput={(params) => <TextField {...params} label="Unidade" size="small" />}
          />
        </div>
      );
    }
    if (type === 'catalog') {
      return (
        <TextField
          {...common}
          select
          required={required}
          value={values[name]}
          onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))}
        >
          {catalogOptions(catalogKind).map((item) => (
            <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
          ))}
        </TextField>
      );
    }
    return (
      <TextField
        {...common}
        required={required}
        multiline={type === 'multiline'}
        minRows={type === 'multiline' ? 2 : undefined}
        type={type === 'int' || type === 'money' ? 'number' : 'text'}
        value={values[name]}
        onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))}
        slotProps={type === 'int'
          ? { htmlInput: { min: 1, step: 1 } }
          : type === 'money' ? { htmlInput: { min: 0.01, step: 0.01 } } : undefined}
      />
    );
  };

  return (
    <section className="cacoin-course-page">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">{config.eyebrow}</p>
          <h1>{mode === 'new' ? config.newTitle : (view === 'pending' ? 'Pendente' : config.listTitle)}</h1>
        </div>
        {mode === 'list' && (
          <div className="cacoin-page-heading-actions">
            <SearchField value={searchTerm} onChange={setSearchTerm} />
            <DataExportMenu
              columns={exportColumns}
              rows={exportRows}
              filename={config.filename}
              title={config.listTitle}
              disabled={loading}
              onError={(exportError) => setError(errorMessage(exportError))}
            />
          </div>
        )}
      </header>
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {(error || statusError) && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error || statusError}</Alert>
      )}

      {mode === 'new' ? (
        <>
          {missingCatalog && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Registe os tipos de despesa e de serviço em Configurações &gt; Despesas &gt; Definição.
            </Alert>
          )}
          <form className="cacoin-test-registration-form" onSubmit={submit}>
            {config.fields.map(renderField)}
            <div className="cacoin-test-registration-actions">
              <Button type="submit" variant="contained" disabled={saving || loading || missingCatalog}>
                {saving ? 'A guardar…' : 'Registar'}
              </Button>
            </div>
          </form>
        </>
      ) : (
        <>
          <StandardTable
            audit={{ expenses: 'Expense', purchases: 'Purchase', returns: 'PurchaseReturn', sales: 'Sale' }[kind]}
            ariaLabel={config.listTitle}
            columns={tableColumns}
            emptyMessage={error
              ? 'Não foi possível carregar os dados.'
              : searchTerm.trim() ? 'Nenhum registo corresponde à pesquisa.' : config.empty}
            loading={loading}
            rows={visibleRows}
            renderRow={(row, rowNumber) => (
              <TableRow key={row.id} hover>
                <TableCell>{rowNumber}</TableCell>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.type === 'quantity'
                      || (isTrade(kind) && cellText(column, row, kind) === NA)
                      ? cellText(column, row, kind)
                      : column.type === 'notes'
                      ? <NotesCell row={row} onEdit={setEditingNotes} onView={setViewingNotes} />
                      : column.type === 'forward'
                        ? (row.forward
                          ? (
                            <>
                              <div>{row.forward.staffName}</div>
                              <StatusBadge
                                label={row.forward.status === 'DONE' ? 'Concluído' : 'Por fazer'}
                                tone={row.forward.status === 'DONE' ? 'paid' : 'pending'}
                              />
                            </>
                          )
                          : '—')
                    : column.type === 'status'
                      ? <StatusBadge label={row.statusLabel} tone={row.statusTone} />
                      : column.type === 'money'
                        ? <Money value={row[column.key]} />
                        : column.type === 'rich'
                          ? <RichTextCell value={row[column.key]} />
                          : cellText(column, row)}
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Tooltip title={row.forward ? 'Reencaminhar' : 'Encaminhar'}>
                    <span>
                      <IconButton
                        className="cacoin-table-action-edit"
                        aria-label={`Encaminhar o registo ${rowNumber}`}
                        disabled={saving}
                        onClick={() => setForwarding(row)}
                      >
                        <Send size={17} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Alterar estado">
                    <span>
                      <IconButton
                        className="cacoin-table-action-edit"
                        aria-label={`Alterar estado do registo ${rowNumber}`}
                        disabled={saving}
                        onClick={(event) => setMenu({ anchor: event.currentTarget, row })}
                      >
                        <ListChecks size={17} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )}
          />
          <ForwardDialog
            kind={kind}
            row={forwarding}
            onClose={() => setForwarding(null)}
            onForwarded={() => {
              setForwarding(null);
              setNotice('Registo encaminhado.');
              load();
            }}
          />
          <NotesDialogs
            kind={kind}
            editing={editingNotes}
            viewing={viewingNotes}
            onCloseEdit={() => setEditingNotes(null)}
            onCloseView={() => setViewingNotes(null)}
            onSaved={() => {
              setEditingNotes(null);
              setNotice('Anotações guardadas.');
              load();
            }}
          />
          <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
            {activeStatuses
              .filter((status) => status.code !== menu?.row.status)
              .map((status) => (
                <MenuItem key={status.id} onClick={() => changeStatus(status.code)}>
                  {status.label}
                </MenuItem>
              ))}
          </Menu>
        </>
      )}
    </section>
  );
}
