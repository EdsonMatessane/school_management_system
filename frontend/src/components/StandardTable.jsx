import { Children, cloneElement, isValidElement, useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Eye } from 'lucide-react';
import AuditDialog from './AuditDialog';
import { isTeacherMode } from '../utils/teacherMode';

const pageSizeOptions = [
  5,
  10,
  15,
  20,
  25,
  50,
  { value: -1, label: 'Todos' },
];

export default function StandardTable({
  audit: auditProp,
  ariaLabel,
  columns,
  emptyMessage,
  loading = false,
  renderRow,
  rows,
  showIndex = true,
}) {
  const audit = isTeacherMode() ? null : auditProp;
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [auditTarget, setAuditTarget] = useState(null);
  const pageCount = rowsPerPage === -1 ? 1 : Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const visiblePage = Math.min(page, pageCount - 1);
  const visibleRows = rowsPerPage === -1
    ? rows
    : rows.slice(visiblePage * rowsPerPage, visiblePage * rowsPerPage + rowsPerPage);
  const message = loading ? 'A carregar…' : emptyMessage;
  const auditTargetOf = (row) => {
    if (!audit) return null;
    const target = typeof audit === 'function' ? audit(row) : { entity: audit, id: row.id };
    return target?.entity && target.id ? target : null;
  };
  const withAudit = (element, row) => {
    if (!audit || !isValidElement(element)) return element;
    const target = auditTargetOf(row);
    return cloneElement(
      element,
      undefined,
      ...Children.toArray(element.props.children),
      <TableCell key="audit" align="right">
        {target && (
          <Tooltip title="Auditoria">
            <IconButton
              size="small"
              aria-label="Auditoria"
              onClick={() => setAuditTarget(target)}
            >
              <Eye size={17} />
            </IconButton>
          </Tooltip>
        )}
      </TableCell>,
    );
  };

  return (
    <Paper className="cacoin-standard-table">
      <TableContainer className="cacoin-standard-table-scroll">
        <Table size="small" aria-label={ariaLabel}>
          <TableHead>
            <TableRow>
              {showIndex && <TableCell>#</TableCell>}
              {columns.map((column) => (
                <TableCell key={column.key} align={column.align}>
                  {column.label}
                </TableCell>
              ))}
              {audit && <TableCell align="right">Auditoria</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.length > 0 ? visibleRows.map((row, index) =>
              withAudit(renderRow(row, visiblePage * rowsPerPage + index + 1), row)) : (
              <TableRow>
                <TableCell colSpan={columns.length + (showIndex ? 1 : 0) + (audit ? 1 : 0)} className="cacoin-table-empty">
                  {message}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={rows.length}
        page={visiblePage}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={pageSizeOptions}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(Number(event.target.value));
          setPage(0);
        }}
        labelRowsPerPage="Itens por página:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`}
        getItemAriaLabel={(type) => {
          const labels = {
            first: 'Ir para a primeira página',
            last: 'Ir para a última página',
            next: 'Ir para a página seguinte',
            previous: 'Ir para a página anterior',
          };
          return labels[type];
        }}
        className="cacoin-standard-table-pagination"
      />
      {audit && <AuditDialog target={auditTarget} onClose={() => setAuditTarget(null)} />}
    </Paper>
  );
}
