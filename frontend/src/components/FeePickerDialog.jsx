import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Radio,
  TableCell,
  TableRow,
} from '@mui/material';
import { CalendarDays } from 'lucide-react';
import Money from './Money';
import SearchField from './SearchField';
import StandardTable from './StandardTable';
import { formatMoney } from '../utils/money';
import { filterBySearch } from '../utils/search';

const columns = [
  { key: 'type', label: 'Tipo' },
  { key: 'description', label: 'Descrição' },
  { key: 'amount', label: 'Valor' },
  { key: 'select', label: 'Selecionar', align: 'right' },
];

function FeePickerBody({ items, selectedId, itemLabel, onClose, onConfirm }) {
  const [pendingId, setPendingId] = useState(selectedId ?? null);
  const [searchTerm, setSearchTerm] = useState('');

  const rows = useMemo(
    () => filterBySearch(items, searchTerm, (fee) => [
      fee.type, fee.description, fee.amount, formatMoney(fee.amount),
    ]),
    [items, searchTerm],
  );
  const pending = items.find((fee) => fee.id === pendingId) ?? null;

  return (
    <>
      <DialogContent>
        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '4px 0 12px' }}>
          <SearchField value={searchTerm} onChange={setSearchTerm} />
        </div>
        <StandardTable
          ariaLabel={`Lista de ${itemLabel}s`}
          columns={columns}
          emptyMessage={searchTerm.trim()
            ? `Nenhuma ${itemLabel} corresponde à pesquisa.`
            : `Não existem ${itemLabel}s ativas.`}
          rows={rows}
          renderRow={(fee, rowNumber) => (
            <TableRow
              key={fee.id}
              hover
              selected={fee.id === pendingId}
              onClick={() => setPendingId(fee.id)}
              onDoubleClick={() => onConfirm(fee)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>{rowNumber}</TableCell>
              <TableCell>
                <span className="cacoin-level-name">
                  <CalendarDays size={18} aria-hidden="true" />
                  {fee.type}
                </span>
              </TableCell>
              <TableCell>{fee.description || '—'}</TableCell>
              <TableCell><Money value={fee.amount} /></TableCell>
              <TableCell align="right">
                <Radio
                  size="small"
                  checked={fee.id === pendingId}
                  onChange={() => setPendingId(fee.id)}
                  slotProps={{ input: { 'aria-label': `Selecionar ${fee.type}` } }}
                />
              </TableCell>
            </TableRow>
          )}
        />
        <Alert severity={pending ? 'success' : 'info'} icon={false} sx={{ mt: 2 }}>
          {pending ? (
            <>
              Está a selecionar a {itemLabel} <strong>{pending.type}</strong>
              {' '}— <Money value={pending.amount} />
              {pending.description ? ` (${pending.description})` : ''}.
            </>
          ) : `Clique numa linha para selecionar a ${itemLabel}.`}
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button type="button" onClick={onClose}>Cancelar</Button>
        <Button
          type="button"
          variant="contained"
          disabled={!pending}
          onClick={() => onConfirm(pending)}
        >
          Confirmar seleção
        </Button>
      </DialogActions>
    </>
  );
}

/**
 * Lista completa (tipo, descrição e valor) para escolher uma taxa, sabendo sempre qual está a
 * ser selecionada. Só altera o valor ao confirmar (ou com duplo clique na linha).
 */
export default function FeePickerDialog({
  open, title, itemLabel = 'mensalidade', items, selectedId, onClose, onConfirm,
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <FeePickerBody
        items={items}
        selectedId={selectedId}
        itemLabel={itemLabel}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    </Dialog>
  );
}
