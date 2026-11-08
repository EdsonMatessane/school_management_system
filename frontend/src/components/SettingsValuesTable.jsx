import { IconButton, TableCell, TableRow, Tooltip } from '@mui/material';
import { Pencil, Trash2 } from 'lucide-react';
import StandardTable from './StandardTable';

/**
 * Tabela reutilizável para definições. Cada linha: { key, cells: [...], onEdit?, onDelete? }.
 * Substitui os antigos campos soltos: o valor configurado aparece na tabela e edita-se num diálogo.
 */
export default function SettingsValuesTable({
  ariaLabel,
  columns,
  rows,
  loading = false,
  disabled = false,
  audit,
  emptyMessage = 'Ainda não existem registos.',
}) {
  const tableColumns = [
    ...columns.map((label, index) => ({ key: `c${index}`, label })),
    { key: 'actions', label: 'Acções', align: 'right' },
  ];
  return (
    <StandardTable
      audit={audit}
      ariaLabel={ariaLabel}
      columns={tableColumns}
      emptyMessage={emptyMessage}
      loading={loading}
      rows={rows}
      renderRow={(row, rowNumber) => (
        <TableRow key={row.key} hover>
          <TableCell>{rowNumber}</TableCell>
          {row.cells.map((cell, index) => <TableCell key={index}>{cell}</TableCell>)}
          <TableCell align="right">
            {row.onEdit && (
              <Tooltip title="Editar">
                <span>
                  <IconButton
                    className="cacoin-table-action-edit"
                    aria-label={`Editar ${row.label ?? ''}`.trim()}
                    disabled={disabled}
                    onClick={row.onEdit}
                  >
                    <Pencil size={17} />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {row.onDelete && (
              <Tooltip title="Apagar">
                <span>
                  <IconButton
                    className="cacoin-table-action-delete"
                    aria-label={`Apagar ${row.label ?? ''}`.trim()}
                    disabled={disabled}
                    onClick={row.onDelete}
                  >
                    <Trash2 size={17} />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </TableCell>
        </TableRow>
      )}
    />
  );
}
